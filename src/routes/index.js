import { Router } from "express";
import { sendSuccess } from "../utils/apiResponse.js";
import servicesRoutes from "./services/index.js";
import appointmentsRoutes from "./appointments/index.js";
import usersRoutes from "./users/index.js";
import transactionsRoutes from "./transactions/index.js";
import statsRoutes from "./stats/index.js";
import paymentsRoutes from "./payments/index.js";

// Collects every route group in one place.
const router = Router();

// Health check, handy to test the live server.
router.get("/", (req, res) => {
  sendSuccess(res, { name: "SalonBook API" }, "SalonBook server is running");
});

router.use("/services", servicesRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/users", usersRoutes);
router.use("/transactions", transactionsRoutes);
router.use("/stats", statsRoutes);
router.use("/payments", paymentsRoutes);

export default router;
