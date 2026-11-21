import { Router } from "express";
import { usersCollection, sessionsCollection } from "../../config/db.js";
import { checkAuthenticatedUser, verifyRole } from "../../middleware/auth.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { toObjectId } from "../../utils/validate.js";

const router = Router();

// Only admins manage users.
router.use(checkAuthenticatedUser, verifyRole(["admin"]));

// GET /users -> every user (no passwords: Better Auth keeps them in the "account" collection)
router.get("/", async (req, res) => {
  const users = await usersCollection
    .find()
    .project({ name: 1, email: 1, image: 1, role: 1, isBlocked: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .toArray();
  sendSuccess(res, users, "All users");
});

// PATCH /users/:id/block  body: { isBlocked: true | false }
router.patch("/:id/block", async (req, res) => {
  const _id = toObjectId(req.params.id, "user id");
  const { isBlocked } = req.body || {};
  if (typeof isBlocked !== "boolean") throw new ApiError(400, "isBlocked must be true or false");
  if (req.user.id === req.params.id) throw new ApiError(400, "You cannot block your own account");

  const user = await usersCollection.findOne({ _id });
  if (!user) throw new ApiError(404, "User not found");
  if (user.role === "admin") throw new ApiError(400, "Admin accounts cannot be blocked");

  await usersCollection.updateOne({ _id }, { $set: { isBlocked, updatedAt: new Date() } });

  // Log a blocked user out everywhere by removing their sessions.
  if (isBlocked) await sessionsCollection.deleteMany({ userId: _id });

  sendSuccess(res, null, isBlocked ? "User blocked" : "User unblocked");
});

export default router;
