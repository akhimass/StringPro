# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

# Racquet Stringing Service – Club Handoff Guide

This application is a lightweight web system designed to manage racquet drop-offs for stringing, prevent forgotten racquets, and give the front desk a clear daily view of what needs to be picked up.

The system is intentionally simple, secure, and easy to operate by front desk staff.

---

## What This System Does

### Front Desk Intake
When a member drops off a racquet, staff enter the details into the system:
- Member name
- Phone number (US numbers only)
- Email address (required)
- Racquet drop-off date (automatically set to today)
- Racquet type
- String selection (from a staff-managed list)
- String tension and power
- Terms & Conditions acceptance

The system automatically calculates a **pickup deadline (3 days after drop-off)**.

---

### Admin Dashboard (Front Desk View)
The Admin page shows **all racquets in one table**, including:
- Member name
- Phone and email
- Drop-off date
- Pickup deadline
- Current status: `processing`, `complete`, or `delivered`

Special indicators:
- **DUE TODAY** – pickup deadline is today
- **OVERDUE** – pickup deadline has passed

Once a racquet is marked **delivered**, it is no longer considered due or overdue.

---

## Status Workflow

Each racquet moves through these statuses:
1. **Processing** – racquet received, work not finished
2. **Complete** – stringing finished, ready for pickup
3. **Delivered** – racquet picked up by member

Only staff can update statuses.

---

## Managing Available Strings

Staff can manage available strings directly in the Admin interface:
- Add new strings
- Edit string details
- Deactivate old strings (they will no longer appear in the drop-off form)

Previously used strings remain attached to past records.

---

## Data Validation & Safety

The system enforces:
- Valid **US phone numbers** (stored in +1XXXXXXXXXX format)
- Valid **email addresses** (required)
- Mandatory acceptance of Terms & Conditions
- Automatic pickup deadline calculation

These checks ensure reliable records and prevent incomplete entries.

---

## Security & Access

- The drop-off form can be used without logging in (front desk intake)
- Admin views and edits require staff login
- Only staff can:
  - View all racquets
  - Change statuses
  - Manage strings

All access is protected by database-level security rules.

---

## What This Version Does NOT Include (Yet)

This version does **not** send automatic SMS or email reminders.

Instead, staff rely on:
- The **Due Today / Overdue** indicators in the Admin dashboard
- Manual reminders if needed

Automated reminders can be added later if the club approves messaging costs.

---

## Daily Front Desk Workflow (Recommended)

1. Enter racquet drop-offs as members arrive
2. Check the Admin dashboard daily
3. Prioritize racquets marked **DUE TODAY** or **OVERDUE**
4. Update status to **Complete** when stringing is finished
5. Update status to **Delivered** when the racquet is picked up

---

## Technical Overview (For IT / Admins)

- Frontend: React + Vite
- Database & Auth: Supabase (PostgreSQL)
- Styling: Tailwind + shadcn-ui
- Hosting: Local or web-based deployment

The system is modular and can be extended with:
- Automated reminders
- Reporting / exports
- Audit logs

---

## Support & Future Enhancements

This system is production-ready for daily operations.

Possible future upgrades:
- Automated email/SMS reminders
- Pickup confirmation notifications
- Analytics (average pickup time, overdue rate)

For changes or enhancements, contact the developer or system administrator.

---

**Status:** ✅ Live MVP – Ready for Club Use