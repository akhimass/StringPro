## CAN-AM StringPro – Racquet Stringing for Elite Badminton Clubs

**CAN-AM StringPro** is a focused racquet stringing operations app designed for **CAN-AM Elite Badminton Clubs** across the **United States, China, and Canada**.  
It standardizes how clubs capture racquet drop-offs, manage daily stringing work, and keep members informed about when their racquets are ready.

The application is intentionally simple, fast, and optimized for front-desk staff and stringers working in busy, high‑volume environments.

---

## Core Experience

### Public Drop-Off for Members
- Public, kiosk‑friendly **Drop-Off** page for any club location.
- Staff (or members at a kiosk) can submit:
  - Member name
  - Primary phone number for contact
  - Optional email address
  - Club location / notes
  - Racquet brand and model
  - String choice (from a curated club catalog)
  - Desired tension
  - Additional add‑ons or special instructions
- Each job gets a **clear estimated completion / pickup window** so expectations are consistent across clubs.

This flow is designed to be used at the front desk with minimal training and minimal typing.

---

### Staff Dashboards

CAN-AM StringPro ships with several role‑based dashboards for clubs in the CAN-AM Elite network:

- **Manager Dashboard (`/admin`)**
  - High‑level overview of all active racquet jobs across a club.
  - Sort and filter by status, due date, or stringer.
  - Manage pricing, available string inventory, and configuration for the club.
  - See which racquets are due today or overdue and re‑balance workload.

- **Front Desk Dashboard (`/frontdesk`)**
  - Designed for front-desk staff handling check‑in and pickup.
  - Quick search by member name or phone number.
  - View job status at a glance (Processing, Complete, Delivered).
  - Mark racquets as **Delivered** when members pick them up.

- **Stringer Dashboard (`/stringer`)**
  - Focused work queue for stringers.
  - See which racquets to string next, along with:
    - String model and gauge
    - Requested tension
    - Extra cost / add‑ons
    - Notes from front desk
  - Update jobs as **Complete** once stringing is finished.

All dashboards share a consistent design system and navigation, with role‑based access controlling which views appear for each staff member.

---

## Why CAN-AM Elite Uses StringPro

- **Unified operations across regions**  
  CAN-AM Elite Badminton Clubs in the **U.S., China, and Canada** can all operate on the same workflow, while still customizing strings, pricing, and notes per club.

- **Fewer lost or forgotten racquets**  
  Every racquet is tracked from Drop-Off to Delivered, reducing misplaced racquets and missed pickups.

- **Clear accountability**  
  Managers can see which racquets are in which state (Processing, Complete, Delivered), who worked on them, and how long jobs are taking.

- **Fast training for new staff**  
  The app uses plain language and clear statuses, so seasonal or part‑time staff can get productive quickly.

---

## Roles and Access

- **Public / Members**
  - Use the Drop-Off page to submit racquets (either directly or through front-desk staff).
  - No login required.

- **Front Desk staff**
  - Access the Front Desk dashboard.
  - Look up jobs, confirm pickups, and answer member questions.

- **Stringers**
  - Access the Stringer dashboard.
  - See their work queue, string racquets, and mark jobs as complete.

- **Managers / Admins**
  - Access the Admin dashboard.
  - Configure strings and pricing, review operational metrics, and oversee workload.

Authentication and authorization are handled so that **only staff** see internal dashboards, while the Drop-Off experience remains public.

---

## Application Overview

At a high level, CAN-AM StringPro:

- Tracks **every racquet** from the moment it’s dropped off until it’s handed back to the member.
- Provides **real‑time status views** tailored to each staff role.
- Uses a **centralized strings catalog** so members see only strings currently offered by their club.
- Keeps a history of past jobs so clubs can understand member preferences and workload over time.

While the underlying implementation uses modern web technologies and a managed backend, this README intentionally focuses on **what the application does**, not how to deploy it or what infrastructure it uses.

For questions about rollout, configuration, or onboarding for new CAN-AM Elite club locations, please coordinate through your internal CAN-AM operations contacts.
