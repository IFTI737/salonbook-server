import { Router } from "express";
import { appointmentsCollection, servicesCollection } from "../../config/db.js";
import { checkAuthenticatedUser, verifyRole } from "../../middleware/auth.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { TIME_SLOTS, isValidFutureDate, toObjectId } from "../../utils/validate.js";

const router = Router();

// Every route here needs a logged-in, not-blocked user.
router.use(checkAuthenticatedUser);

// ---------------- Customer ----------------

// POST /appointments -> book a service (customers only, admins cannot book)
router.post("/", verifyRole(["customer"]), async (req, res) => {
  const { serviceId, appointmentDate, timeSlot, message = "" } = req.body || {};

  const serviceObjectId = toObjectId(serviceId, "service id");
  if (!isValidFutureDate(appointmentDate)) throw new ApiError(400, "Please choose today or a future date");
  if (!TIME_SLOTS.includes(timeSlot)) throw new ApiError(400, "Please choose a valid time slot");
  if (String(message).length > 500) throw new ApiError(400, "Message is too long (max 500 characters)");

  // Only active services can be booked. The price is read from the DB, never from the browser.
  const service = await servicesCollection.findOne({ _id: serviceObjectId });
  if (!service) throw new ApiError(404, "Service not found");
  if (service.status !== "active") throw new ApiError(400, "This service is not available for booking");

  const customerId = toObjectId(req.user.id, "user id");

  // No double booking: the same service, date and slot can only have one active appointment.
  const slotTaken = await appointmentsCollection.findOne({
    serviceId: serviceObjectId,
    appointmentDate,
    timeSlot,
    active: true,
  });
  if (slotTaken) throw new ApiError(409, "This time slot is already booked. Please choose another one.");

  // A customer cannot be in two places at once.
  const customerBusy = await appointmentsCollection.findOne({
    customerId,
    appointmentDate,
    timeSlot,
    active: true,
  });
  if (customerBusy) throw new ApiError(409, "You already have an appointment at this date and time.");

  const appointment = {
    serviceId: serviceObjectId,
    customerId,
    appointmentDate,
    timeSlot,
    message: String(message).trim(),
    servicePrice: service.price,
    paymentStatus: "unpaid",
    status: "pending",
    // `active` is true until the appointment is cancelled (used by the unique index too)
    active: true,
    // copies for easy display in tables
    serviceName: service.serviceName,
    serviceImage: service.image,
    serviceCategory: service.category,
    customerName: req.user.name,
    customerEmail: req.user.email,
    createdAt: new Date(),
  };

  try {
    const result = await appointmentsCollection.insertOne(appointment);
    sendSuccess(res, { _id: result.insertedId, ...appointment }, "Appointment booked", 201);
  } catch (err) {
    // two people pressed "Book" at the same moment: the unique index stops the second one
    if (err.code === 11000) throw new ApiError(409, "This time slot was just booked. Please choose another one.");
    throw err;
  }
});

// GET /appointments/my -> the logged-in customer's own appointments
router.get("/my", verifyRole(["customer"]), async (req, res) => {
  const customerId = toObjectId(req.user.id, "user id");
  const list = await appointmentsCollection.find({ customerId }).sort({ createdAt: -1 }).toArray();
  sendSuccess(res, list, "Your appointments");
});

// PATCH /appointments/:id/cancel -> a customer cancels their OWN pending appointment
router.patch("/:id/cancel", verifyRole(["customer"]), async (req, res) => {
  const _id = toObjectId(req.params.id, "appointment id");
  const customerId = toObjectId(req.user.id, "user id");

  const appointment = await appointmentsCollection.findOne({ _id, customerId });
  // same message for "not found" and "not yours", so ids of others cannot be guessed
  if (!appointment) throw new ApiError(404, "Appointment not found");
  if (appointment.status !== "pending") throw new ApiError(400, "Only pending appointments can be cancelled");

  await appointmentsCollection.updateOne(
    { _id },
    { $set: { status: "cancelled", active: false, updatedAt: new Date() } },
  );
  sendSuccess(res, null, "Appointment cancelled");
});

// ---------------- Admin ----------------

// GET /appointments?status= -> all appointments
router.get("/", verifyRole(["admin"]), async (req, res) => {
  const { status } = req.query;
  const filter = ["pending", "confirmed", "cancelled"].includes(status) ? { status } : {};
  const list = await appointmentsCollection.find(filter).sort({ createdAt: -1 }).toArray();
  sendSuccess(res, list, "All appointments");
});

// PATCH /appointments/:id/status -> admin confirms or cancels
router.patch("/:id/status", verifyRole(["admin"]), async (req, res) => {
  const _id = toObjectId(req.params.id, "appointment id");
  const { status } = req.body || {};
  if (!["confirmed", "cancelled"].includes(status)) throw new ApiError(400, "Status must be confirmed or cancelled");

  const appointment = await appointmentsCollection.findOne({ _id });
  if (!appointment) throw new ApiError(404, "Appointment not found");
  if (appointment.status === "cancelled") throw new ApiError(400, "This appointment is already cancelled");
  if (status === "confirmed" && appointment.status !== "pending") {
    throw new ApiError(400, "Only pending appointments can be confirmed");
  }
  // payment records are never edited here, and a paid appointment cannot be cancelled
  if (status === "cancelled" && appointment.paymentStatus === "paid") {
    throw new ApiError(400, "A paid appointment cannot be cancelled");
  }

  await appointmentsCollection.updateOne(
    { _id },
    { $set: { status, active: status !== "cancelled", updatedAt: new Date() } },
  );
  sendSuccess(res, null, `Appointment ${status}`);
});

export default router;
