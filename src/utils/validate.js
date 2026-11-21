import { ObjectId } from "mongodb";
import { ApiError } from "./ApiError.js";

// The 7 categories from the assignment. The server checks every value it saves.
export const SERVICE_CATEGORIES = [
  "Haircut & Styling",
  "Hair Coloring",
  "Hair Treatment",
  "Facial & Skincare",
  "Makeup",
  "Manicure & Pedicure",
  "Spa & Massage",
];

// Fixed time slots a customer can book.
export const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

// Turns a string id into an ObjectId, or throws a clean 400 error.
export function toObjectId(id, label = "id") {
  if (!ObjectId.isValid(id)) throw new ApiError(400, `Invalid ${label}`);
  return new ObjectId(id);
}

// "2026-12-05" style date that is today or later.
export function isValidFutureDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value >= today;
}
