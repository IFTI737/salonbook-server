import { env } from "./config/env.js";
import { connectDB, closeDB } from "./config/db.js";
import app from "./app.js";

// Entry point: connect to MongoDB first, then start the HTTP server.
// Vercel runs this file as a serverless function, so we also export the app.

try {
  await connectDB();
  console.log("Connected to MongoDB");
} catch (err) {
  console.error("Failed to connect to MongoDB:", err.message);
  process.exit(1);
}

// On Vercel the platform handles listening. We only listen on our own machine.
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });

  // Close the database connection when the process is stopped (Ctrl+C or restart).
  const shutdown = async () => {
    await closeDB();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export default app;
