import { Router } from "express";
import { sendSuccess } from "../utils/apiResponse.js";

// Collects every route group in one place.
// Later: router.use("/services", servicesRoutes), and so on.

const router = Router();

// Health check, handy to test the live server.
router.get("/", (req, res) => {
  sendSuccess(res, { name: "SalonBook API" }, "SalonBook server is running");
});

export default router;
