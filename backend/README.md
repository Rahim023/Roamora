# Roamora backend

The backend uses Express, Mongoose, and MongoDB. Mongoose models are in `src/models`; every model explicitly binds to its intended collection.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Set the rotated MongoDB URI in `backend/.env` without posting it in chat or committing it. The default database name is `Roamora`; set `MONGODB_DB_NAME` to override it. `.env` is ignored by Git.

Run model tests with `npm test`, start the API with `npm run dev`, and check `http://localhost:5000/api/health`.
Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters), and optionally `ADMIN_NAME` in `.env`, then run `npm run admin:bootstrap` to provision an administrator. This command updates only the matching admin account or creates it; it does not print the password.

The booking endpoints require MongoDB replica-set transaction support (MongoDB Atlas supports this). Confirmation emails are recorded as `not_sent_demo` when SMTP is not configured. The website does not collect or transfer money; new bookings start with no payment recorded.

Administrators can promote active users and mark confirmed bookings completed. Completion makes the booking eligible for its owner's trip review; cancelled and pending bookings cannot be completed.

Administrators can edit account names, email addresses, roles and active status in the traveller panel. They cannot demote or deactivate their own account, and inactive administrators must be demoted before deactivation. Email, role and status changes invalidate existing sessions; an email change also clears pending password resets. Account edits use a MongoDB transaction and reject stale edits, so a replica set is required.

On completion, an email invites the booking contact to review the journey using a sign-in-protected booking link. SMTP must be configured for delivery; completion remains saved if SMTP is missing or fails, and the admin booking list shows the delivery state and offers a retry. A pending attempt can be retried after five minutes. No email is sent when the account has already reviewed that journey. One review per account and journey is permitted. On sign-in, travellers are reminded of completed journeys they have not reviewed; dismissing the reminder leaves them eligible at their next sign-in.

The admin workspace has a separate interface at `/admin`. Every `/api/admin/*` endpoint requires authentication and checks the account's current active administrator role in the database on each request; a role claimed in a token alone does not grant access. Regular users cannot access the admin workspace or admin APIs. Only existing administrators can grant another active user administrator access.

For journey image uploads, configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in the backend environment, never in the frontend or source control. The admin journey form accepts JPEG, PNG or WebP up to 5 MB; saving uploads the image to Cloudinary and stores its secure URL with the package. Upload and package saving are separate operations, so an upload can remain in Cloudinary if package saving is abandoned.

The admin overview includes all customer accounts, active catalogue entries, and confirmed or completed bookings in its counts. Booking value charts sum the total value of currently confirmed or completed bookings by creation month in UTC, separately for each currency. This month's expected value uses bookings created during the current UTC calendar month. Cancelled and pending bookings are excluded, and a cancellation removes that booking's value from the charts. These are booking values, not payments received or payment due dates; the website does not collect money. The overview refreshes every 30 seconds.

The booking-value trend shows the last six or twelve UTC calendar months, including zero-value months, with a currency selector when necessary. The overview also shows upcoming scheduled departures and recent bookings. Admin search uses the existing journey, booking, and traveller lists; their API list limits apply.

The admin sections have searchable, filterable lists and show summaries of the loaded records (bookings and reviews are limited to the latest 200, accounts to the latest 500). Departure occupancy uses booked seats and capacity; the departure calendar filters by UTC date. Journey destination and country are edited in the journey form. Homepage destination cards use the existing site content.

In the admin interface, marked records whose booking reference contains the sample label are displayed using the booking ID instead; similarly labelled names are shown as “Traveller.” Stored references and names are unchanged.

Travo uses `GEMINI_API_KEY` and defaults to `gemini-3.1-flash-lite`; set `GEMINI_MODEL` to override the model. The public chat sends recent conversation messages and public catalogue data to Google Gemini, not account or booking records. Context is capped at 100 active packages, 100 activities, and 200 upcoming available departures; answers can be incomplete or incorrect. The chat is not persisted and is rate-limited per IP. The existing itinerary planning API remains available and requires a model that supports JSON generation. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM` to send booking confirmations and review requests. Set `CLIENT_ORIGIN` to the public frontend origin so review links work outside the local machine.

Restart a backend started with `npm start` after updating server code, or use `npm run dev` for automatic restarts. A `Route not found` response from `/api/travo` can indicate that an older server is still running. In the chat, Enter sends a message and Shift+Enter adds a line. Stop waiting cancels the browser request; it cannot guarantee that the provider stops processing it.

Google sign-in uses the public web client ID configured with `GOOGLE_CLIENT_ID` in the backend and `VITE_GOOGLE_CLIENT_ID` in the frontend. Both default to the supplied Roamora client ID and must match. In Google Cloud, add each frontend origin (for example `http://localhost:5173`) to the OAuth client's authorized JavaScript origins and configure its consent screen. The API verifies Google ID tokens and requires a verified email; an existing account with the same email is not automatically linked, so users must sign in with their original method.

New email/password accounts require at least 8 characters, a lowercase letter, a number, and a non-whitespace special character. Passwords are limited to 72 UTF-8 bytes because bcrypt only processes the first 72 bytes. Existing passwords can still be used to log in.

Password recovery requires working SMTP settings and a strong, private `JWT_SECRET`. A local account can request a six-digit code, valid for 10 minutes and limited to five attempts; requests for the same account are throttled to one per minute. Codes and reset authorizations are single-use, and a successful reset invalidates existing login tokens. Google-only accounts must continue to use Google sign-in. Responses do not disclose whether an account exists; actual ownership is established only when the code is received and verified. Missing SMTP configuration is reported to the client; delivery failures are logged without exposing the recipient or code. Rate limits use the default in-memory store, so multi-instance deployments need a shared rate-limit store and correctly configured proxy trust.

## Live collection inspection

`npm run db:inspect` connects read-only and reports collection document counts plus observed BSON field types. It never prints document values. `npm run db:compare-models` validates every stored document against its Mongoose model with strict unknown-field handling; it prints only collection names, counts, and schema error paths, never field values.

The live `Roamora` database was inspected read-only on 12 November 2026. All 140 documents across the nine populated application collections passed model validation after the schemas were aligned to the stored BSON fields. Observed collection names include the existing singular `package` and `wishlist`, and the existing misspelling `iteneraries`; models bind explicitly to those names to avoid silently writing to new pluralized collections. The database also has empty `packages`, `wishlists`, and `itineraries` collections; they contain no documents and are not the collections used by the models. No collections or records were modified during inspection or comparison.

The demo data has empty package and hero image arrays, so the BSON type of array elements cannot be inferred. Those fields use `Mixed` array elements until image records are added and their shape is established. Destination `image` values are currently BSON null.

## Models and collections

| Model | Collection |
|---|---|
| `User` | `users` |
| `Package` | `package` |
| `Departure` | `departures` |
| `Order` | `orders` |
| `Wishlist` | `wishlist` |
| `Review` | `reviews` |
| `Activity` | `activities` |
| `Itinerary` | `iteneraries` |
| `SiteContent` | `sitecontents` |

Stored names aligned to the model include `Activity.name` and `pricePerPersonMinor`, departure `startDate`/`endDate`, order `startDate`/`endDate` and scalar `emailStatus`, itinerary `estimatedActivitiesTotalMinor`, and the nested `SiteContent.hero` object. The stored homepage document is keyed `homepage`.

## API areas

All endpoints are under `/api`. Public routes cover health, site content, activity catalogue, package search/details, departures, and reviews. Authenticated routes cover profile, wishlists, booking history and cancellation, reviews, and personal itineraries/AI planning. `/admin/*` routes require a live user with the `admin` role. Booking and cancellation use MongoDB transactions, departure capacity is reserved atomically, and booking creation requires a client-generated idempotency key.

The itinerary studio starts with a destination and currency, then shows active catalogue activities for that exact destination and currency. `GET /api/activities` supports `destination`, `match=exact`, and `currency`; without `match=exact`, destination matching remains a substring search. Results are limited to 200. Itinerary edits are saved as the traveller plans, and the Save itinerary button explicitly saves the current plan. Changing a destination does not remove existing stops. Estimates include catalogue activities for the traveller count, not accommodation, transport, or unlisted meals.

Customers can remove their own cancelled bookings from My trips using `PATCH /api/orders/:id/hide`. This hides the entry from `GET /api/orders/mine` but retains the booking and refund record; active bookings cannot be hidden. Existing records without the field remain visible.

Reviews with no `isPublished` field are treated as published for compatibility with the existing demo data. Reviews explicitly marked `false` are excluded from public listings and their ratings.

Search query parameters include `q`, `destination`, `travelType`, `currency` (CAD or USD), `minPrice`, `maxPrice`, `minDays`, `maxDays`, `sort`, `page`, and `limit`. Prices are minor units (for example `149900` = CAD 1,499.00).

The homepage accepts a CAD budget, including cents, and only returns trips priced in CAD. Explore budget filters allow CAD or USD and only compare trips in the selected currency. No exchange-rate conversion is performed; price sorting without a budget can compare numerical amounts across currencies.

Prices are integer minor units with an ISO currency code. Bookings retain package and departure snapshots. Departure inventory fields must satisfy `availableSeats = capacity - bookedSeats`; atomic reservation and cancellation updates belong in the booking service, not in model validation alone.
