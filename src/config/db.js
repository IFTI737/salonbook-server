import { MongoClient } from "mongodb";
import { env } from "./env.js";

// Same database name the frontend (Better Auth) uses.
export const DB_NAME = "salonbook";

const client = new MongoClient(env.DB_URI);
/** @type {import("mongodb").Db} */
let db = client.db(DB_NAME);

// Opens the connection and checks it with a ping.
// Called once at startup from src/index.js.
export async function connectDB() {
  await client.connect();
  db = client.db(DB_NAME);
  await db.command({ ping: 1 });
  await createIndexes();
  return db;
}

// The database itself refuses a second active booking for the same service, date and slot,
// even if two customers click "Book" at the exact same moment.
async function createIndexes() {
  await db.collection("appointments").createIndex(
    { serviceId: 1, appointmentDate: 1, timeSlot: 1 },
    { unique: true, partialFilterExpression: { active: true }, name: "one_active_booking_per_slot" },
  );
  await db.collection("appointments").createIndex({ customerId: 1, createdAt: -1 });
  await db.collection("transactions").createIndex({ stripeSessionId: 1 }, { unique: true, sparse: true });
}

// "user" and "session" are created and managed by Better Auth on the client side.
export const usersCollection = db.collection("user");
export const sessionsCollection = db.collection("session");
export const servicesCollection = db.collection("services");
export const appointmentsCollection = db.collection("appointments");
export const transactionsCollection = db.collection("transactions");

export async function closeDB() {
  await client.close();
}
