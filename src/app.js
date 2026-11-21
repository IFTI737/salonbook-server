import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { stripeWebhook } from "./webhooks/stripe.js";

// Builds the Express app. Does not start listening (see src/index.js).

const app = express();

// The Stripe webhook comes BEFORE express.json(): Stripe needs the raw request body
// to check its signature. Stripe is a server, so this route has no CORS.
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);

// Only the frontend may call this API from a browser.
app.use(
  cors({
    origin: [env.CLIENT_URL, "http://localhost:3000"],
  }),
);

// Parse JSON request bodies.
app.use(express.json());

app.use("/", routes);

// Must come after all routes.
app.use(notFound);
app.use(errorHandler);

export default app;
