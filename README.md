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

---

## Supabase Backend Access (For Club Admins)

- Supabase Dashboard → Table Editor
- Key tables:
  - `racquet_jobs` – all stringing jobs
  - `strings` – dropdown values

**Staff Access**
- Managed via Supabase Auth → Users

**If Admin shows no data:**
- Ensure you are logged in
- Ensure correct Supabase project

---

## What This Version Does NOT Include (Yet)
- Automated SMS or email reminders

These can be added later as a paid upgrade.

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