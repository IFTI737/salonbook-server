import Stripe from "stripe";

// Stripe client, created the first time it is needed.
// This way the server still starts if the key is missing (only payments will fail).
let client;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error("Payments are not set up yet (STRIPE_SECRET_KEY is missing)"), { statusCode: 503 });
  }
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
