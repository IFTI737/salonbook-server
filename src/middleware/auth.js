import { createRemoteJWKSet, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { env } from "../config/env.js";
import { usersCollection } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

// The client (Better Auth jwt plugin) publishes its public keys here.
// We create the key set once and reuse it for every request.
const JWKS = createRemoteJWKSet(new URL(`${env.CLIENT_URL}/api/auth/jwks`));

// Step 1: check the Bearer token and find the real user in the database.
// We never trust the role from the frontend. We read role and isBlocked from the DB.
export const checkAuthenticatedUser = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  const token = header.split(" ")[1]; // format is "Bearer <token>"

  let payload;
  try {
    const result = await jwtVerify(token, JWKS, {
      issuer: env.CLIENT_URL, // must match the JWT issuer (the client BASE_URL)
      audience: env.CLIENT_URL, // must match the JWT audience (the client BASE_URL)
    });
    payload = result.payload;
  } catch (e) {
    throw new ApiError(401, "Unauthorized: Invalid token");
  }

  // Better Auth stores the user id as an ObjectId in MongoDB.
  const userId = ObjectId.isValid(payload.id) ? new ObjectId(payload.id) : null;
  const user = userId ? await usersCollection.findOne({ _id: userId }) : null;

  if (!user) {
    throw new ApiError(401, "Unauthorized: User not found");
  }

  // A blocked user cannot use any protected API.
  if (user.isBlocked) {
    throw new ApiError(403, "Your account has been blocked. Please contact the salon.");
  }

  req.user = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  next();
};

// Step 2: allow only some roles. Use it after checkAuthenticatedUser.
// Example: router.get("/", checkAuthenticatedUser, verifyRole(["admin"]), handler)
export const verifyRole = (roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user?.role)) {
      return next();
    }

    throw new ApiError(
      403,
      "Forbidden: You do not have the required role to access this resource",
    );
  };
};
