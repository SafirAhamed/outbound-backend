# Payment App (Razorpay) — Local dev with MongoDB

This small payment demo uses Razorpay on the frontend and a lightweight Express server.

What changed
- Orders are persisted to MongoDB via Mongoose (replaces `orders.json`).
- Use `nodemon` for development with `npm run dev`.
- Read configuration from `.env` (see `.env.example`).

Quick start

1. Copy `.env.example` to `.env` and update values (Razorpay keys and MongoDB URI):

   ```bash
   cp .env.example .env
   # edit .env as needed
   ```

2. Install dependencies and dev deps (from inside `payment-app/`):

   ```bash
   npm install
   ```

3. Start in development (auto-restarts on change):

   ```bash
   npm run dev
   ```

4. Open the frontend in your browser:

   - http://localhost:8000/index.html

Notes

- The app uses `MONGODB_URI` from environment; if not provided it will default to `mongodb://127.0.0.1:27017/payment-app`.
- For production, provide real Razorpay credentials and secure them via environment variables.
- If you want to seed previous `orders.json` into MongoDB, I can add a tiny script to do that—ask and I'll implement it.
