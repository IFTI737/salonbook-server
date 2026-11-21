import { appointmentsCollection, transactionsCollection } from "../config/db.js";
import { getStripe } from "../config/stripe.js";
import { ObjectId } from "mongodb";

// POST /api/webhooks/stripe
// Stripe calls this after a payment. It is the ONLY place that marks an appointment as paid
// and the only place that creates transaction records.
// app.js mounts it with express.raw() because the signature check needs the untouched body.
export async function stripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is missing");
    return res.status(500).send("Webhook is not configured");
  }

  // Step 1: verify the signature, so only genuine Stripe events are accepted.
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, secret);
  } catch (e) {
    console.log("Stripe webhook verification failed:", e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  // Step 2: handle the one event we care about.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const appointmentId = session.metadata?.appointmentId;

    if (session.payment_status === "paid" && ObjectId.isValid(appointmentId)) {
      const _id = new ObjectId(appointmentId);
      const appointment = await appointmentsCollection.findOne({ _id });

      if (appointment) {
        const now = new Date();
        // Safe to run twice: Stripe may send the same event again.
        await appointmentsCollection.updateOne(
          { _id },
          { $set: { paymentStatus: "paid", paidAt: now, updatedAt: now } },
        );
        // One transaction per Stripe session (the unique index on stripeSessionId backs this up).
        await transactionsCollection.updateOne(
          { stripeSessionId: session.id },
          {
            $setOnInsert: {
              appointmentId: _id,
              customerId: appointment.customerId,
              serviceId: appointment.serviceId,
              amount: (session.amount_total ?? 0) / 100,
              currency: session.currency,
              stripeSessionId: session.id,
              paymentIntentId: session.payment_intent || null,
              status: "paid",
              createdAt: now,
            },
          },
          { upsert: true },
        );
        console.log("Payment recorded for appointment:", appointmentId);
      } else {
        console.log("Paid session for an unknown appointment:", appointmentId);
      }
    }
  }

  // Step 3: answer quickly, otherwise Stripe waits and retries.
  res.json({ received: true });
}
