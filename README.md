** Outbound Backend server **

This repository contains the backend API for the Outbound project.

Related projects in this workspace:

- `outbound-backend` — backend API (Node.js / Express)
- `outbound-travelers` — frontend application (Next.js)

Quick local setup
1. Copy `.env.example` to `.env` and fill the values (do not commit `.env`). Important variables added for OAuth & payments:
	- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
	- `FRONTEND_URL`
	- `COOKIE_NAME`, `COOKIE_SECURE`, `COOKIE_DOMAIN`
	- `PAYMENT_APP_URL`
2. Start the payment-app (if used):
	- cd `payment-app` and run `npm install` then `npm run dev` (defaults to port 8000)
3. Start backend:
	- npm install
	- npm run dev

Notes
- OAuth flow: backend sets an HttpOnly cookie after successful Google login. Ensure `FRONTEND_URL` and `GOOGLE_CALLBACK_URL` are configured properly.
- Purchase flow: frontend calls `POST /v1/books/:id/create-order` on the backend which creates a Razorpay order via the payment-app. When Razorpay sends the webhook to `/v1/webhooks/razorpay` and payment is captured, the backend will add the purchased book to the user's `purchasedBooks` list.