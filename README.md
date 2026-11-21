# SalonBook Server

REST API for **SalonBook**, a salon appointment booking platform. Customers browse salon services, book a date and time slot, and pay online. Admins manage services, appointments, users and payments.

## Features

- JWT verification (Better Auth tokens checked with the client's public keys)
- Role-based access control (admin / customer) checked on the server for every protected route
- Role and blocked status are always read from the database, never trusted from the browser
- Blocked users cannot use protected APIs, and blocking signs them out
- Services API: public list with search, category filter and price sort; admin add / edit / delete / activate
- Appointments API: customers book and cancel only their own pending appointments; admins confirm or cancel
- No double booking: checked in code and enforced by a unique MongoDB index
- Users API (admin): list, block and unblock
- Read-only transactions API and dashboard stats
- Stripe Checkout with a verified webhook (payment is marked paid only by the webhook)

## API Overview

| Method | Path | Access |
| --- | --- | --- |
| GET | `/services` | Public (active only) |
| GET | `/services/:id` | Public |
| GET | `/services/booked-slots` | Public |
| GET | `/services/admin/all` | Admin |
| POST / PATCH / DELETE | `/services`, `/services/:id`, `/services/:id/status` | Admin |
| POST | `/appointments` | Customer |
| GET | `/appointments/my` | Customer |
| PATCH | `/appointments/:id/cancel` | Customer (own, pending) |
| GET | `/appointments` | Admin |
| PATCH | `/appointments/:id/status` | Admin |
| GET / PATCH | `/users`, `/users/:id/block` | Admin |
| GET | `/transactions` / `/transactions/my` | Admin / Customer |
| GET | `/stats/admin` / `/stats/customer` | Admin / Customer |
| POST | `/payments/create-checkout-session` | Customer (own, confirmed, unpaid) |
| GET | `/payments/status/:appointmentId` | Customer (own) |
| POST | `/api/webhooks/stripe` | Stripe only (signature verified) |

## Scripts

```bash
npm run seed                          # add sample salon services
npm run make-admin -- you@example.com # turn an existing account into an admin
```

## Tech Stack

- Node.js, Express 5
- MongoDB (official driver)
- jose (JWT verification)
- Stripe
- Deployed on Vercel

## Installation

```bash
git clone https://github.com/IFTI737/salonbook-server.git
cd salonbook-server
npm install
```

## Run Locally

1. Copy `.env.example` to `.env` and fill in the values.
2. Start the server:

```bash
npm run dev
```

The API runs on `http://localhost:5000`.

## Environment Variables

Only the names are listed here. Never commit your real `.env` file.

| Name | Purpose |
| --- | --- |
| `PORT` | Port the API listens on (default 5000) |
| `DB_URI` | MongoDB connection string |
| `CLIENT_URL` | Frontend URL (CORS and JWT issuer/audience) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Links

- Live server: https://salonbook-server-sepia.vercel.app
- Live site: https://salonbook-client-psi.vercel.app
- Client repository: https://github.com/IFTI737/salonbook-client
