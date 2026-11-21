import { Router } from "express";
import { servicesCollection, appointmentsCollection } from "../../config/db.js";
import { checkAuthenticatedUser, verifyRole } from "../../middleware/auth.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { SERVICE_CATEGORIES, toObjectId } from "../../utils/validate.js";

const router = Router();

// Checks the body of add/update requests. `partial` = update (fields are optional).
function readServiceBody(body, partial = false) {
  const data = {};
  const { serviceName, category, description, price, duration, image } = body || {};

  if (serviceName !== undefined || !partial) {
    if (!serviceName || String(serviceName).trim().length < 3) {
      throw new ApiError(400, "Service name must be at least 3 characters");
    }
    data.serviceName = String(serviceName).trim();
  }
  if (category !== undefined || !partial) {
    if (!SERVICE_CATEGORIES.includes(category)) throw new ApiError(400, "Please choose a valid category");
    data.category = category;
  }
  if (description !== undefined || !partial) {
    if (!description || String(description).trim().length < 10) {
      throw new ApiError(400, "Description must be at least 10 characters");
    }
    data.description = String(description).trim();
  }
  if (price !== undefined || !partial) {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) throw new ApiError(400, "Price must be a positive number");
    data.price = Math.round(value * 100) / 100;
  }
  if (duration !== undefined || !partial) {
    const value = Number(duration);
    if (!Number.isInteger(value) || value < 5 || value > 600) {
      throw new ApiError(400, "Duration must be between 5 and 600 minutes");
    }
    data.duration = value;
  }
  if (image !== undefined || !partial) {
    if (!image || !/^https?:\/\//.test(image)) throw new ApiError(400, "Please upload a service image");
    data.image = image;
  }
  return data;
}

// ---------------- Public ----------------

// GET /services?search=&category=&sort=price-asc|price-desc&limit=
// Only active services are shown to the public.
router.get("/", async (req, res) => {
  const { search = "", category = "", sort = "", limit } = req.query;
  const filter = { status: "active" };

  if (search) {
    // escape regex characters so a search like "a+b" does not crash
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.serviceName = { $regex: safe, $options: "i" };
  }
  if (category && SERVICE_CATEGORIES.includes(category)) filter.category = category;

  let sortBy = { createdAt: -1 };
  if (sort === "price-asc") sortBy = { price: 1 };
  if (sort === "price-desc") sortBy = { price: -1 };

  let cursor = servicesCollection.find(filter).sort(sortBy);
  const max = Number(limit);
  if (Number.isInteger(max) && max > 0) cursor = cursor.limit(Math.min(max, 50));

  sendSuccess(res, await cursor.toArray(), "Services fetched");
});

// GET /services/booked-slots?serviceId=&date=  -> slots already taken for that day
router.get("/booked-slots", async (req, res) => {
  const { serviceId, date } = req.query;
  const _id = toObjectId(serviceId, "service id");
  const taken = await appointmentsCollection
    .find({ serviceId: _id, appointmentDate: date, status: { $ne: "cancelled" } })
    .project({ timeSlot: 1 })
    .toArray();
  sendSuccess(res, taken.map((a) => a.timeSlot), "Booked slots fetched");
});

// ---------------- Admin ----------------

// GET /services/admin/all -> every service, active or not
router.get("/admin/all", checkAuthenticatedUser, verifyRole(["admin"]), async (req, res) => {
  const services = await servicesCollection.find().sort({ createdAt: -1 }).toArray();
  sendSuccess(res, services, "All services fetched");
});

// POST /services -> add a new service
router.post("/", checkAuthenticatedUser, verifyRole(["admin"]), async (req, res) => {
  const data = readServiceBody(req.body);
  const service = { ...data, status: "active", createdAt: new Date() };
  const result = await servicesCollection.insertOne(service);
  sendSuccess(res, { _id: result.insertedId, ...service }, "Service added", 201);
});

// PATCH /services/:id -> update details
router.patch("/:id", checkAuthenticatedUser, verifyRole(["admin"]), async (req, res) => {
  const _id = toObjectId(req.params.id, "service id");
  const data = readServiceBody(req.body, true);
  if (Object.keys(data).length === 0) throw new ApiError(400, "Nothing to update");

  const result = await servicesCollection.findOneAndUpdate(
    { _id },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw new ApiError(404, "Service not found");
  sendSuccess(res, result, "Service updated");
});

// PATCH /services/:id/status -> activate or deactivate
router.patch("/:id/status", checkAuthenticatedUser, verifyRole(["admin"]), async (req, res) => {
  const _id = toObjectId(req.params.id, "service id");
  const { status } = req.body || {};
  if (!["active", "inactive"].includes(status)) throw new ApiError(400, "Status must be active or inactive");

  const result = await servicesCollection.findOneAndUpdate(
    { _id },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw new ApiError(404, "Service not found");
  sendSuccess(res, result, `Service is now ${status}`);
});

// DELETE /services/:id
router.delete("/:id", checkAuthenticatedUser, verifyRole(["admin"]), async (req, res) => {
  const _id = toObjectId(req.params.id, "service id");

  // Keep history safe: a service with upcoming active appointments cannot be deleted.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = await appointmentsCollection.countDocuments({
    serviceId: _id,
    status: { $in: ["pending", "confirmed"] },
    appointmentDate: { $gte: today },
  });
  if (upcoming > 0) {
    throw new ApiError(409, "This service has upcoming appointments. Deactivate it instead of deleting.");
  }

  const result = await servicesCollection.deleteOne({ _id });
  if (result.deletedCount === 0) throw new ApiError(404, "Service not found");
  sendSuccess(res, null, "Service deleted");
});

// ---------------- Public (by id) ----------------
// Placed last so "/admin/all" and "/booked-slots" are not read as an id.

// GET /services/:id -> details (inactive ones are returned so the page can say "not available")
router.get("/:id", async (req, res) => {
  const _id = toObjectId(req.params.id, "service id");
  const service = await servicesCollection.findOne({ _id });
  if (!service) throw new ApiError(404, "Service not found");
  sendSuccess(res, service, "Service fetched");
});

export default router;
