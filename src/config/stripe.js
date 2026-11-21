import Stripe from "stripe";
import { ApiError } from "../utils/ApiError.js";

// Stripe client, created the first time it is needed.
// This way the server still starts if the key is missing (only payments will fail).
let client;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is missing");
    throw new ApiError(400, "Online payment is not available right now. Please try again later.");
  }
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
