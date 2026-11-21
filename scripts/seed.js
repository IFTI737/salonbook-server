// Adds sample salon services so the site has data to show.
// Run once: npm run seed   (it skips services that already exist by name)
import { MongoClient } from "mongodb";
import "dotenv/config";

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const services = [
  { serviceName: "Classic Haircut & Blow Dry", category: "Haircut & Styling", price: 25, duration: 45, image: img("photo-1560066984-138dadb4c035"), description: "A precise cut tailored to your face shape, finished with a smooth blow dry and light styling." },
  { serviceName: "Men's Fade & Beard Trim", category: "Haircut & Styling", price: 18, duration: 40, image: img("photo-1503951914875-452162b0f3f1"), description: "Clean skin fade with a sharp beard line-up and hot towel finish for a fresh, neat look." },
  { serviceName: "Full Head Balayage", category: "Hair Coloring", price: 95, duration: 150, image: img("photo-1522337360788-8b13dee7a37e"), description: "Hand-painted, sun-kissed highlights that grow out softly. Includes toner and gloss." },
  { serviceName: "Root Touch-Up Color", category: "Hair Coloring", price: 40, duration: 60, image: img("photo-1595476108010-b4d1f102b1b1"), description: "Cover grey roots and refresh your base color with long-lasting, ammonia-free dye." },
  { serviceName: "Keratin Smoothing Treatment", category: "Hair Treatment", price: 120, duration: 180, image: img("photo-1519699047748-de8e457a634e"), description: "Tames frizz and adds shine for up to three months. Great for humid weather." },
  { serviceName: "Deep Conditioning Hair Spa", category: "Hair Treatment", price: 35, duration: 50, image: img("photo-1527799820374-dcf8d9d4a388"), description: "Nourishing mask, scalp massage and steam to repair dry, damaged hair." },
  { serviceName: "Hydrating Glow Facial", category: "Facial & Skincare", price: 55, duration: 60, image: img("photo-1570172619644-dfd03ed5d881"), description: "Cleanse, exfoliate and hydrate with a calming mask for fresh, glowing skin." },
  { serviceName: "Bridal Makeup", category: "Makeup", price: 150, duration: 120, image: img("photo-1487412947147-5cebf100ffc2"), description: "Long-wear bridal makeup with a trial look, lashes and touch-up kit for your big day." },
  { serviceName: "Party Makeup & Hairdo", category: "Makeup", price: 60, duration: 75, image: img("photo-1512496015851-a90fb38ba796"), description: "Glam makeup with a matching hairstyle for parties, shoots and special events." },
  { serviceName: "Gel Manicure", category: "Manicure & Pedicure", price: 28, duration: 45, image: img("photo-1604654894610-df63bc536371"), description: "Shape, cuticle care and chip-free gel polish that lasts up to three weeks." },
  { serviceName: "Spa Pedicure", category: "Manicure & Pedicure", price: 32, duration: 50, image: img("photo-1519014816548-bf5fe059798b"), description: "Foot soak, scrub, massage and polish for soft, happy feet." },
  { serviceName: "Aromatherapy Full Body Massage", category: "Spa & Massage", price: 70, duration: 60, image: img("photo-1544161515-4ab6ce6db874"), description: "Relaxing full body massage with essential oils to melt away stress." },
];

const client = new MongoClient(process.env.DB_URI);
await client.connect();
const col = client.db("salonbook").collection("services");

let added = 0;
for (const s of services) {
  const exists = await col.findOne({ serviceName: s.serviceName });
  if (exists) continue;
  await col.insertOne({ ...s, status: "active", createdAt: new Date() });
  added++;
}
console.log(`Seed done: ${added} new services added.`);
await client.close();
