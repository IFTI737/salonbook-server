import { Router } from "express";
import { transactionsCollection, appointmentsCollection } from "../../config/db.js";
import { checkAuthenticatedUser, verifyRole } from "../../middleware/auth.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { toObjectId } from "../../utils/validate.js";

// Transactions are read-only here. Only the Stripe webhook will create them.
const router = Router();
router.use(checkAuthenticatedUser);

// GET /transactions -> admin sees all payments, with the appointment details
router.get("/", verifyRole(["admin"]), async (req, res) => {
  const list = await transactionsCollection
    .aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: { from: appointmentsCollection.collectionName, localField: "appointmentId", foreignField: "_id", as: "appointment" } },
      { $unwind: { path: "$appointment", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();
  sendSuccess(res, list, "All transactions");
});

// GET /transactions/my -> a customer's own payments
router.get("/my", verifyRole(["customer"]), async (req, res) => {
  const customerId = toObjectId(req.user.id, "user id");
  const list = await transactionsCollection.find({ customerId }).sort({ createdAt: -1 }).toArray();
  sendSuccess(res, list, "Your transactions");
});

export default router;
