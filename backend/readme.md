Clean up expired TemporaryHold entries before checking

Create Hold:
POST /api/hold

Input: guest name, email, roomId, checkIn/out

If available, create a TemporaryHold (15 mins expiry)

Return holdId for Stripe session

🛠 In holdService.ts, ensure you:

Validate date range

Prevent overlapping Booking and non-expired Holds

💳 4. Stripe Integration
Create Checkout Session:
POST /api/stripe/create-session

Input: temporaryHoldId

Attach hold metadata to session

Return Stripe session URL

Webhook Handler:
POST /api/stripe/webhook

On checkout.session.completed:

Convert TemporaryHold → Booking

Create Payment record

Delete TemporaryHold

Use stripeController.ts and stripeService.ts

📖 5. Admin Bookings API
GET /api/admin/bookings

Protected by authMiddleware

Return all bookings with related room info

🧼 6. Expired Hold Handling
Option A (Preferred):
Add to jobs/cleanExpiredHolds.ts

Use node-cron or setInterval

Run every 5 min: delete expired TemporaryHold

Option B (Fallback):
Trigger cleanup inside:

/availability

/hold

🧪 7. Validation & Error Handling
Use Zod for:

Input validation in controllers

Attach validateRequest.ts middleware

Use centralized errorHandler.ts

Handle edge cases:

Room not available

Invalid dates

Stripe failure

Expired holds

🗂 Final Notes
Naming: Keep file and function names consistent (e.g., createRoom, checkAvailability)

Service Layer: Handle Prisma logic in services/, controllers should just handle req/res

Security: Use HTTPS, secure cookies, and rate limiting on hold/booking endpoints