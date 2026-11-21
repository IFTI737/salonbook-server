# SalonBook Server

REST API for **SalonBook**, a salon appointment booking platform. Customers browse salon services, book a date and time slot, and pay online. Admins manage services, appointments, users and payments.

## Features (planned, built step by step)

- JWT verification (Better Auth tokens checked with the client's public keys)
- Role-based access control (admin / customer) checked on the server
- Blocked users cannot use protected APIs
- Services, appointments and transactions APIs
- No double booking for the same date and time slot
- Stripe Checkout with a verified webhook (payment is marked paid only by the webhook)

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
| `STRIPE_SECRET_KEY` | Stripe secret key (added with payments) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (added with payments) |

## Links

- Live server: _add after deploy_
- Client repository: https://github.com/IFTI737/salonbook-client
