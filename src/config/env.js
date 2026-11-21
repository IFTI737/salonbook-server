import "dotenv/config";

// Central place for environment variables.
// Other files import `env` from here instead of reading process.env directly.

const DB_URI = process.env.DB_URI;

if (!DB_URI) {
  throw new Error(
    "Missing required environment variable: DB_URI. Copy .env.example to .env and fill in your MongoDB connection string.",
  );
}

// The deployed frontend. Used when the server runs on Vercel but CLIENT_URL
// is missing or still points to localhost (a common copy-paste mistake).
const LIVE_CLIENT_URL = "https://salonbook-client-psi.vercel.app";

function getClientUrl() {
  let fromEnv = (process.env.CLIENT_URL || "").trim().replace(/\/+$/, "");
  // A value pasted without "https://" would crash new URL(), so add it.
  if (fromEnv && !/^https?:\/\//i.test(fromEnv)) fromEnv = `https://${fromEnv}`;
  const onVercel = Boolean(process.env.VERCEL);
  if (onVercel && (!fromEnv || fromEnv.includes("localhost"))) return LIVE_CLIENT_URL;
  return fromEnv || "http://localhost:3000";
}

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  DB_URI,
  // Frontend URL. It is also the JWT issuer/audience, so it must match exactly.
  CLIENT_URL: getClientUrl(),
};
