// Turns an existing account into an admin. Admins are never created from the public Sign Up page.
// Usage: npm run make-admin -- someone@example.com
import { MongoClient } from "mongodb";
import "dotenv/config";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.log("Usage: npm run make-admin -- someone@example.com");
  process.exit(1);
}

const client = new MongoClient(process.env.DB_URI);
await client.connect();
const result = await client
  .db("salonbook")
  .collection("user")
  .updateOne({ email }, { $set: { role: "admin", isBlocked: false } });

console.log(
  result.matchedCount
    ? `${email} is now an admin. Sign out and sign in again.`
    : `No account found for ${email}. Sign up first, then run this again.`,
);
await client.close();
