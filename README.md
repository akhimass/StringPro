# StringPro

**StringPro** is a lightweight **racquet stringing service tracker** built specifically for **badminton clubs**. It helps front desks track racquet drop-offs, prevent forgotten pickups, and maintain a clear, daily operational view of all stringing jobs.

The system is intentionally simple, secure, and designed for real front-desk workflows.

---

## Quick Start (Running StringPro)

### Option A: Run locally (recommended for club IT/admin)

**Prerequisites**
- Node.js 18+
- Git

**1) Clone the repository**
```bash
git clone https://github.com/akhimass/racquet-hub.git
cd racquet-hub
```

**2) Install dependencies**
```bash
npm install
```

**3) Create a local environment file**
Create `.env.local` in the project root:

```env

VITE_SUPABASE_URL=https://spaniwzjuywvwgdjycyr.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_3y8EZCy5xyUAApwWrZEOww_5uHVSwg7

```

> Never commit `.env` or `.env.local` files.

**4) Start the app**
```bash
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

---

## What StringPro Does

### Front Desk Intake (Drop-Off)
When a member drops off a racquet, staff enter:
- Member name
- **US phone number** (validated and normalized)
- **Email address** (required)
- Racquet drop-off date (**defaults to today**)
- Racquet type
- String selection (staff-managed)
- String tension and power
- Acceptance of Terms & Conditions

StringPro automatically calculates a **pickup deadline (3 days after drop-off)**.

---

### Admin Dashboard
The Admin dashboard shows **all racquets in one table**, including:
- Member contact info
- Drop-off date
- Pickup deadline
- Status: `processing`, `complete`, `delivered`

Visual indicators:
- **DUE TODAY** – pickup deadline is today
- **OVERDUE** – pickup deadline has passed

Once a racquet is marked **delivered**, it is removed from due/overdue tracking.

---

## Status Workflow
1. **Processing** – racquet received
2. **Complete** – stringing finished
3. **Delivered** – racquet picked up

Only authorized staff can update statuses.

---

## Managing Available Strings
Staff can manage available strings from the Admin interface:
- Add new strings
- Edit string details
- Deactivate old strings

Inactive strings no longer appear in the drop-off form, but remain attached to historical records.

---

## Data Validation & Reliability
StringPro enforces:
- Valid **US phone numbers** (`+1XXXXXXXXXX`)
- Valid **email addresses** (required)
- Required Terms & Conditions acceptance
- Automatic pickup deadline calculation

---

## Security & Access
- Drop-off form is public (front desk use)
- Admin pages require staff login
- Only staff can view/update jobs and manage strings

Security is enforced with Supabase Row Level Security (RLS).

---

## Database Setup (One-Time)

If the Supabase project is new, run the database setup SQL in **Supabase → SQL Editor** to create:
- Tables: `strings`, `racquet_jobs`
- Trigger: auto-set `pickup_deadline`
- Validation constraints (phone/email)
- RLS policies

**Storage (photo uploads):** You cannot create the bucket via SQL. In **Supabase Dashboard → Storage**, create a bucket named **`racquet-photos`** and set it to **Public** so drop-off and completed photos work. Upload paths are `jobs/<job_id>/intake/...` and `jobs/<job_id>/completed/...`.

---

## Edge Functions & Messaging (SMS / Email)

SMS verification (Twilio Verify), SMS reminders, and email notifications (Resend) run in **Supabase Edge Functions**. Secrets are set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (never in the browser).

### Required secrets

| Secret | Description |
|--------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (keep server-side only) |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify service SID (phone OTP) |
| `TWILIO_FROM_NUMBER` | Twilio phone number for SMS (e.g. +15551234567) |
| `EMAIL_PROVIDER_API_KEY` | Resend API key (or SendGrid/Mailgun if you switch the function) |
| `EMAIL_FROM` | Sender email (e.g. `StringPro <notifications@yourdomain.com>`) |
| `APP_BASE_URL` | Base URL of the app (e.g. `https://yourapp.vercel.app`) |
| `SUPABASE_URL` | Supabase project URL (usually set automatically) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for Edge Functions to insert status_events, etc.) |

### Local dev (Edge Functions)

```bash
# From project root; requires Supabase CLI
supabase functions serve --no-verify-jwt
```

Use `--no-verify-jwt` so the frontend can call functions without auth during development. Set the secrets above in a `.env.local` or via `supabase secrets set` so the functions can reach Twilio and Resend.

---

## Supabase Backend Access (For Club Admins)

- Supabase Dashboard → Table Editor
- Key tables:
  - `racquet_jobs` – all stringing jobs
  - `strings` – dropdown values

**Staff Access**
- Managed via Supabase Auth → Users and `public.profiles.role`.

**If Admin shows no data:**
- Ensure you are logged in with a staff account (role `admin`, `frontdesk`, or `stringer` in `profiles`).
- Ensure correct Supabase project.

---

## Staff Accounts and Roles

- **Drop-off (`/`)** and **Login (`/login`)** are public; no account is required for customers or kiosk drop-off.
- **Dashboards** (`/admin`, `/frontdesk`, `/stringer`) are staff-only. Only logged-in users with the right role can access them.

### Creating a staff account

1. **Sign up via the app**  
   Go to `/login` and use “Sign up” (if you add it) or create the user in Supabase:
   - **Supabase Dashboard → Authentication → Users → Add user**  
   - Enter email and password (or use “Invite” and have the user set a password).

2. **Promote to staff**  
   New users get `role = 'customer'` from the `on_auth_user_created` trigger. To make them staff, set `profiles.role` to one of:
   - `admin` – access to Manager, Stringer, and Front Desk
   - `frontdesk` – access to Front Desk only
   - `stringer` – access to Stringer only  

   **Option A – SQL (Supabase → SQL Editor):**
   ```sql
   -- Replace the email with the staff member's auth email
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'staff@club.com');
   ```

   **Option B – Table Editor**  
   Open **Table Editor → profiles**, find the row by user `id` (same as `auth.users.id`), and set `role` to `admin`, `frontdesk`, or `stringer`.

3. **Log in**  
   Staff sign in at `/login` with that email and password; they will see only the nav links allowed for their role (Drop-Off + relevant dashboard(s) + Logout).

---

## What This Version Does NOT Include (Yet)
- Public “Sign up” link on the login page (staff are created in Dashboard or invited); JWT verification for Edge Functions can be tightened for production.

---

## Recommended Daily Workflow
1. Enter drop-offs
2. Check Admin dashboard daily
3. Prioritize **DUE TODAY / OVERDUE**
4. Mark **Complete** when ready
5. Mark **Delivered** on pickup

---

## Tech Stack
- React + Vite
- Supabase (PostgreSQL + Auth)
- Tailwind CSS + shadcn-ui

---

**Status:** ✅ StringPro MVP – Ready for Club Use