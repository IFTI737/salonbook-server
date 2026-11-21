import { Router } from "express";
import { appointmentsCollection } from "../../config/db.js";
import { env } from "../../config/env.js";
import { getStripe } from "../../config/stripe.js";
import { checkAuthenticatedUser, verifyRole } from "../../middleware/auth.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { toObjectId } from "../../utils/validate.js";

const router = Router();
router.use(checkAuthenticatedUser);

// POST /payments/create-checkout-session { appointmentId }
// A customer pays for their OWN confirmed and unpaid appointment.
// The amount always comes from the database, never from the browser.
router.post("/create-checkout-session", verifyRole(["customer"]), async (req, res) => {
  const appointmentId = toObjectId(req.body?.appointmentId, "appointment id");
  const customerId = toObjectId(req.user.id, "user id");

  const appointment = await appointmentsCollection.findOne({ _id: appointmentId, customerId });
  // same message for "not found" and "not yours"
  if (!appointment) throw new ApiError(404, "Appointment not found");
  if (appointment.status !== "confirmed") throw new ApiError(400, "You can pay only after the salon confirms the appointment");
  if (appointment.paymentStatus === "paid") throw new ApiError(400, "This appointment is already paid");

  const unitAmount = Math.round(Number(appointment.servicePrice) * 100);
  if (!Number.isFinite(unitAmount) || unitAmount < 50) throw new ApiError(400, "This price cannot be paid online");

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: appointment.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: appointment.serviceName,
            description: `${appointment.appointmentDate} at ${appointment.timeSlot}`,
          },
        },
      },
    ],
    // The webhook reads these to know which appointment was paid.
    metadata: {
      appointmentId: appointmentId.toString(),
      customerId: customerId.toString(),
    },
    success_url: `${env.CLIENT_URL}/payment/success?appointmentId=${appointmentId.toString()}`,
    cancel_url: `${env.CLIENT_URL}/payment/cancel?appointmentId=${appointmentId.toString()}`,
  });

  sendSuccess(res, { redirectUrl: session.url }, "Checkout session created");
});

// GET /payments/status/:appointmentId -> is my appointment paid yet?
// The success page polls this while it waits for the webhook. It only reads, it never changes anything.
router.get("/status/:appointmentId", verifyRole(["customer"]), async (req, res) => {
  const _id = toObjectId(req.params.appointmentId, "appointment id");
  const customerId = toObjectId(req.user.id, "user id");
  const appointment = await appointmentsCollection.findOne({ _id, customerId }, { projection: { paymentStatus: 1, serviceName: 1, servicePrice: 1 } });
  if (!appointment) throw new ApiError(404, "Appointment not found");
  sendSuccess(res, appointment, "Payment status");
});

export default router;
