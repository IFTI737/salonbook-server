import { Router } from "express";
import {
  appointmentsCollection,
  servicesCollection,
  transactionsCollection,
  usersCollection,
} from "../../config/db.js";
import { checkAuthenticatedUser, verifyRole } from "../../middleware/auth.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { toObjectId } from "../../utils/validate.js";

const router = Router();
router.use(checkAuthenticatedUser);

// Counts appointments by status for a filter, e.g. { pending: 2, confirmed: 1, ... }
async function countByStatus(filter = {}) {
  const rows = await appointmentsCollection
    .aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }])
    .toArray();
  const counts = { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
  rows.forEach((r) => {
    counts[r._id] = r.count;
    counts.total += r.count;
  });
  return counts;
}

// GET /stats/customer -> numbers for the customer overview
router.get("/customer", verifyRole(["customer"]), async (req, res) => {
  const customerId = toObjectId(req.user.id, "user id");
  const counts = await countByStatus({ customerId });
  const paid = await appointmentsCollection.countDocuments({ customerId, paymentStatus: "paid" });
  const upcoming = await appointmentsCollection
    .find({ customerId, active: true, appointmentDate: { $gte: new Date().toISOString().slice(0, 10) } })
    .sort({ appointmentDate: 1 })
    .limit(3)
    .toArray();
  sendSuccess(res, { ...counts, paid, upcoming }, "Customer stats");
});

// GET /stats/admin -> numbers for the admin overview
router.get("/admin", verifyRole(["admin"]), async (req, res) => {
  const [totalServices, activeServices, totalCustomers, blockedUsers, appointments, revenueRows, recent] =
    await Promise.all([
      servicesCollection.countDocuments(),
      servicesCollection.countDocuments({ status: "active" }),
      usersCollection.countDocuments({ role: "customer" }),
      usersCollection.countDocuments({ isBlocked: true }),
      countByStatus(),
      transactionsCollection
        .aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
        .toArray(),
      appointmentsCollection.find().sort({ createdAt: -1 }).limit(5).toArray(),
    ]);

  sendSuccess(
    res,
    {
      totalServices,
      activeServices,
      totalCustomers,
      blockedUsers,
      appointments,
      revenue: revenueRows[0]?.total || 0,
      recent,
    },
    "Admin stats",
  );
});

export default router;
