# StringPro Requirements-to-Implementation Audit

**Project:** StringPro (Racket Stringing Management)  
**Client:** CAN-AM Elite Badminton Club  
**Source of truth:** STRINGING MANAGEMENT.docx  
**Audit date:** February 5, 2026  

---

## TASK 1 — Feature Checklist (Parsed from Doc)

Requirements are grouped by category and tagged with ID, statement, priority (P0/P1/P2), and dependencies.

### A) Customer-facing (Web intake + status)

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| SP-INTAKE-01 | Customers complete a Stringing Service Intake Form on the website. | P0 | `racquet_jobs`, intake form UI |
| SP-INTAKE-02 | System generates ticket number in format CANAMYYMMXXX (California local time). | P0 | `racquet_jobs.ticket_number`, server/DB sequence |
| SP-INTAKE-03 | System displays expected stringing completion time (regular: 48 hours). | P0 | Display logic, config |
| SP-INTAKE-04 | System displays due pickup time (pickup required within 10 days). | P0 | `pickup_deadline`, 10-day rule |
| SP-INTAKE-05 | Intake captures: customer name, email, phone; racket brand and model; string selection with price; requested tension (predefined); stencil; grip add-ons; grommet repair (Y/N); rush options; waiver + signature; payment confirmation. | P0 | Form fields, `strings`, pricing, waiver |
| SP-INTAKE-06 | Out-of-stock items cannot be selected. | P0 | `strings` or inventory table with quantity |
| SP-INTAKE-07 | Low stock (&lt;5 units) highlighted; expected restock date shown if unavailable. | P1 | Inventory quantity, restock date |
| SP-INTAKE-08 | Rush stringing: 1-day +$10, 2-hour +$20; rush orders clearly marked. | P0 | Pricing fields, rush type |
| SP-INTAKE-09 | Special Stringer A: +$10. | P0 | Stringer selection, pricing |
| SP-INTAKE-10 | Waiver acknowledgment and customer signature required. | P0 | Waiver text, signature capture (typed + timestamp for MVP) |
| SP-INTAKE-11 | Payment: Phase 1 front desk; Phase 2 online + drop-box photo timestamp. | P1 | Payment status field, optional photo |
| SP-STATUS-01 | Job status visible to customers (e.g. status lookup by ticket/email). | P1 | Public status page or link, RLS |

### B) Staff / Front desk workflow

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| SP-FD-01 | Front desk receives racket and marks “Received by Front Desk” with staff name, date, time. | P0 | Status timeline, `staff_name`, timestamp |
| SP-FD-02 | Front desk explains waiver and confirms acknowledgment. | P0 | Waiver confirmation in workflow |
| SP-FD-03 | Photo documentation: racket head (brand/model), overall frame condition. | P1 | Photo storage, attachments |
| SP-FD-04 | Job status visible to front desk staff. | P0 | Staff view, RLS |
| SP-FD-05 | At pickup: customer signs to confirm; front desk verifies identity; if friend picks up, prior written authorization + ID. | P1 | Pickup signature, notes |
| SP-FD-06 | Front desk confirms payment and releases racket, recording staff name and date/time. Status → “Pickup Completed”. | P0 | Payment confirmation, status, attribution |

### C) Stringing manager workflow (inventory + allocation + QC)

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| SP-MGR-01 | All string inventory managed exclusively by Stringing Manager; stringers do not access inventory directly. | P0 | Roles, RLS on inventory |
| SP-MGR-02 | For each order: manager selects approved string, measures/prepares length, labels and attaches to racket with ticket number. | P0 | Allocation UI, ticket number on job |
| SP-MGR-03 | Racket marked “Ready for Stringing” with manager name, date, time. | P0 | Status timeline, attribution |
| SP-MGR-04 | Manager is primary QC: correct string, quantity, error identification before/after stringing. | P1 | QC step, status transition |

### D) Stringer workflow

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| SP-STR-01 | Rackets in stringer lockers with ticket labels; stringers collect by priority and due date. | P1 | Queue view, priority/due sort |
| SP-STR-02 | Stringer confirms pickup in system with name, date, time; status → “Received by Stringer – [Name]”. | P0 | Status timeline, stringer attribution |
| SP-STR-03 | Stringer performs service per recorded requirements. | P0 | Job details visible to stringer |
| SP-STR-04 | If issues (cracks, defects, worn grommets, unsafe tension): photo, notify customer, discuss; changes require customer approval. | P1 | Issue logging, customer notification |
| SP-STR-05 | Completion: photos of completed racket; job marked Completed with name, date, time; return to front desk; status → “Completed / Ready for Pickup”. | P0 | Status timeline, completion attribution |

### E) Admin / Management (pricing, inventory, reporting)

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| SP-ADM-01 | All products/strings display price and inventory status online and at front desk; same data source. | P0 | `strings` or products table: price, quantity |
| SP-ADM-02 | Only Admin may update inventory quantities and pricing. | P0 | RLS, role “admin” |
| SP-ADM-03 | Management reports by time period: rackets per stringer, string material cost, labor cost per stringer, total revenue, estimated profit. | P1 | Reporting queries/views, roles |
| SP-ADM-04 | Reports visible to Admin/Management only. | P1 | RLS |

### F) Notifications & overdue handling

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| SP-NOTIF-01 | Pickup within 10 days; reminders between days 7–10. | P1 | Cron/edge job, email (MVP) or SMS |
| SP-NOTIF-02 | After 10 days: rackets moved to waiting pickup locker; status → “Waiting Pickup”; club not responsible for loss/damage. | P0 | Status “waiting_pickup”, overdue logic |
| SP-NOTIF-03 | Low stock (&lt;5): Admin notified. | P1 | Notification job or trigger |

### G) Waiver / signature + compliance / audit trail

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| SP-WAIVE-01 | Waiver terms: racket condition & risk; pickup in 10 days; authorization; acknowledgment that customer read and agreed. | P0 | Waiver text, stored with job |
| SP-WAIVE-02 | Customer signature required (MVP: typed signature + timestamp). | P0 | `signature_text`, `signature_at` |
| SP-AUDIT-01 | Status timeline with staff/stringer name + time for each transition. | P0 | `status_timeline` or events table |

### H) Data model & permissions (roles, RLS)

| ID | Requirement | Priority | Dependencies |
|----|-------------|----------|--------------|
| SP-DM-01 | Inventory deducted when orders placed; availability validated at order creation. | P0 | Inventory quantity, transaction/constraint |
| SP-DM-02 | System designed to support future integration (e.g. Shopify). | P2 | API shape, product IDs |
| SP-DM-03 | Roles: Customer (intake, status); Front desk; Stringing manager; Stringer; Admin/Management. | P0 | Auth, RLS by role |
| SP-DM-04 | RLS: who can see what (jobs, inventory, reports) by role. | P0 | Supabase RLS policies |
| SP-ERR-01 | Correction orders: stringer error → ticket + “C” suffix; same stringer; labor=0, string=0; actual string cost recorded; flagged for reports. | P1 | `correction_order`, parent ticket, finance flag |

---

## TASK 2 — Current Implementation Summary

### Existing routes and behavior

| Route | File | Purpose |
|-------|------|--------|
| `/` | `src/pages/DropOff.tsx` | Customer intake form: name, phone, email, drop-off date, racket brand/model, string select, tension, notes, terms checkbox. Submits to `racquet_jobs`. No ticket number shown. |
| `/admin` | `src/pages/Admin.tsx` | Admin dashboard: “Racquets” tab (list, search, status filter, status dropdown, mark delivered, delete); “Settings” tab (Strings CRUD: brand, name, gauge, active). No role check. |
| `*` | `src/pages/NotFound.tsx` | 404. |

No dedicated routes for: front desk, stringing manager, stringer, customer status lookup, reporting, or waiver/signature page.

### Existing database (Supabase)

**Tables (from `supabase/migrations/20251216051727_*.sql` and `src/integrations/supabase/types.ts`):**

- **`strings`**  
  - Columns: `id` (UUID), `name`, `brand`, `gauge`, `active`, `created_at`.  
  - No: `price`, `quantity`, `restock_date`, `color`.

- **`racquet_jobs`**  
  - Columns: `id` (UUID), `member_name`, `phone`, `email`, `drop_in_date`, `racquet_type`, `string_id` (FK strings), `string_power`, `string_tension`, `terms_accepted`, `terms_accepted_at`, `status`, `pickup_deadline`, `reminder_2_sent`, `reminder_3_sent`, `created_at`, `updated_at`.  
  - No: `ticket_number`, status timeline, staff/stringer attribution, rush type, special stringer, payment status, waiver signature text/timestamp, grommet/stencil/grip, photo refs.

**Indexes:** `racquet_jobs(status)`, `racquet_jobs(pickup_deadline)`, `racquet_jobs(drop_in_date)`.

**Trigger:** `update_updated_at_column()` on `racquet_jobs`.

**RLS:** Enabled on both tables. Policies are “Anyone can SELECT/INSERT/UPDATE/DELETE” for both tables (no role-based restriction).

### Role assumptions

- No auth or roles in app or DB. Header shows “Drop-Off” and “Admin” to everyone.  
- README mentions “RLS” but current policies do not enforce roles.

### Notifications

- `reminder_2_sent` and `reminder_3_sent` exist on `racquet_jobs` but are not set or used by any cron/edge function. No email/SMS implementation found.

### APIs (`src/lib/api.ts`)

- **Strings:** `fetchStrings`, `createString`, `updateString`, `deleteString` (all use Supabase client).  
- **Racquet jobs:** `fetchRacquets`, `createRacquet`, `updateRacquetStatus`, `deleteRacquet`.  
- No ticket generation, no inventory deduction, no timeline or attribution APIs.

### UI components

- **Intake:** `DropOff.tsx` – form with string dropdown (active only), no price, no inventory, no rush/stringer options, no signature, terms checkbox only.  
- **Admin:** `Admin.tsx` – racquet table with `StatusBadge`, `DueStatusBadge`; status options: Processing, In Progress, Complete, Delivered, Cancelled (no “Received by Front Desk”, “Received by Stringer”, “Ready for Pickup”, “Waiting Pickup”).  
- **Status badges:** `StatusBadge.tsx`, `DueStatusBadge.tsx` – used in admin only; no customer-facing status page.  
- No: front desk view, stringer view, manager view, reporting UI, waiver/signature capture component.

---

## TASK 3 — Gap Analysis Matrix

| Requirement ID | Requirement | Status | Evidence | What’s missing | Recommended fix | Priority |
|----------------|-------------|--------|----------|----------------|-----------------|----------|
| SP-INTAKE-01 | Intake form on website | Implemented | `src/pages/DropOff.tsx` | — | — | P0 |
| SP-INTAKE-02 | Ticket CANAMYYMMXXX (California) | Missing | No `ticket_number` in migration or api | Ticket column; server-side sequence by YYMM; California timezone | Add `ticket_number` (unique), generator in DB or edge function using California time | P0 |
| SP-INTAKE-03 | Display expected completion (48h) | Partial | DropOff shows “pickup by” only | Explicit “ready in 48h” and 10-day pickup rule | Show “Ready in 48 hours” and “Pick up within 10 days” on success/confirmation | P0 |
| SP-INTAKE-04 | Pickup within 10 days | Partial | `api.ts` / DropOff use +3 days for pickup_deadline | Doc says 10 days | Change pickup_deadline to drop_in_date + 10 days | P0 |
| SP-INTAKE-05 | Full intake fields (stencil, grip, grommet, rush, etc.) | Partial | DropOff has core fields only | Stencil, grip, grommet Y/N, rush, stringer, price display | Add columns and form fields; add pricing logic | P0 |
| SP-INTAKE-06 | Out-of-stock cannot be selected | Missing | `strings` has no quantity | Inventory quantity; filter in UI and API | Add `quantity` to strings (or inventory table); hide/disable when 0 | P0 |
| SP-INTAKE-07 | Low stock &lt;5 highlighted, restock date | Missing | No quantity/restock in strings | Quantity, restock_date | Add columns; highlight in dropdown; show restock if unavailable | P1 |
| SP-INTAKE-08 | Rush 1-day +$10, 2-hour +$20 | Missing | No rush in schema or UI | rush_type, rush price | Add `rush_type` (enum) and price calc; show in form and total | P0 |
| SP-INTAKE-09 | Special Stringer A +$10 | Missing | No stringer selection | stringer_id or option, +$10 | Add stringer option and pricing | P0 |
| SP-INTAKE-10 | Waiver + signature required | Partial | Terms checkbox + terms_accepted_at only | Waiver text, signature (typed + timestamp) | Add waiver text component, signature field, `signature_text`, `signature_at` | P0 |
| SP-INTAKE-11 | Payment Phase 1/2 | Missing | No payment fields | payment_status, optional photo | Add payment_status; Phase 1 = front desk confirmation only | P1 |
| SP-STATUS-01 | Customer job status visible | Missing | No status lookup page | Public page by ticket + email | Add route e.g. /status, lookup by ticket_number + email | P1 |
| SP-FD-01 | “Received by Front Desk” + staff, date, time | Missing | Single status field, no attribution | Timeline + attribution | Add status_events (or timeline table) and “received_front_desk” with staff_name, at | P0 |
| SP-FD-02 | Waiver confirmation at front desk | Partial | Waiver stored at intake only | Explicit front-desk confirmation step | Add FD confirmation in workflow (e.g. checkbox when marking received) | P0 |
| SP-FD-03 | Photo documentation | Missing | No photo storage | Storage (e.g. Supabase Storage), FK on job | Add attachment table or column; upload in FD flow | P1 |
| SP-FD-04 | Job status visible to front desk | Partial | Admin list is all-purpose; no FD role | Role “front_desk” and view | Add roles; FD sees same jobs (or filtered); RLS | P0 |
| SP-FD-05 | Pickup: sign, verify ID, friend auth | Missing | No pickup workflow | Pickup signature, notes | Add pickup signature + notes; optional “released_to” | P1 |
| SP-FD-06 | Confirm payment, release, “Pickup Completed” | Partial | Status “delivered” exists, no payment or attribution | Payment confirmation, staff name, timestamp | Add payment_confirmed_at, released_by, released_at; map “delivered” to “Pickup Completed” with attribution | P0 |
| SP-MGR-01 | Manager-only inventory | Missing | RLS allows anyone | Role stringing_manager; RLS so only manager (and admin) write inventory | Define roles; RLS for inventory writes | P0 |
| SP-MGR-02 | Manager assigns string to job, labels racket | Missing | No allocation step | “Ready for stringing” step, manager attribution | Add status “ready_for_stringing” + manager name, at | P0 |
| SP-MGR-03 | “Ready for Stringing” + manager name, date, time | Missing | No timeline | Same as above | Status timeline + manager attribution | P0 |
| SP-MGR-04 | Manager QC | Missing | No QC step | Optional QC status/note | Add QC transition or note (P1) | P1 |
| SP-STR-01 | Stringer lockers, collect by priority/due | Missing | No stringer queue | Stringer view sorted by due/priority | Add /stringer queue page | P1 |
| SP-STR-02 | “Received by Stringer – [Name]” | Missing | No stringer attribution | Status event with stringer name | Timeline with “received_by_stringer” + stringer name, at | P0 |
| SP-STR-03 | Stringer sees requirements | Partial | Admin shows job details | Stringer-specific view | FD/Admin view can serve; or dedicated stringer view | P0 |
| SP-STR-04 | Issues: photo, notify, customer approval | Missing | No issue flow | Issue log, customer notification | Add issue type + note; optional notification (P1) | P1 |
| SP-STR-05 | Completed + photos, “Ready for Pickup” | Partial | “Complete” exists, no attribution/photos | Completion attribution, optional photos | Timeline “completed” with stringer name, at; “complete” = “Ready for Pickup” | P0 |
| SP-ADM-01 | Products with price and inventory | Partial | Strings exist, no price/quantity | price, quantity on strings | Add price, quantity; show in intake and admin | P0 |
| SP-ADM-02 | Only Admin updates inventory/pricing | Missing | RLS is “Anyone” | RLS by role | Restrict INSERT/UPDATE/DELETE on strings to admin (and manager for inventory if split) | P0 |
| SP-ADM-03 | Management reports | Missing | No reports | Reports by period: per stringer, costs, revenue, profit | New report queries + Admin “Reports” tab | P1 |
| SP-ADM-04 | Reports Admin-only | Missing | No RLS by role | RLS on report view or API | Enforce admin/management role for report data | P1 |
| SP-NOTIF-01 | Reminders days 7–10 | Partial | reminder_2_sent, reminder_3_sent columns only | Cron/edge to send and set flags | Edge function or cron: email (MVP), set reminder_*_sent | P1 |
| SP-NOTIF-02 | After 10 days → “Waiting Pickup” | Missing | No “waiting_pickup” status | Status value + auto-update logic | Add status waiting_pickup; cron or trigger after 10 days past pickup_deadline | P0 |
| SP-NOTIF-03 | Low stock notify Admin | Missing | No notification | Trigger or job when quantity &lt; 5 | After quantity added: notify (e.g. email) or in-app | P1 |
| SP-WAIVE-01 | Waiver terms stored | Partial | terms_accepted only | Full waiver text and agreement timestamp | Store waiver_version or text; terms_accepted_at already present | P0 |
| SP-WAIVE-02 | Signature (typed + timestamp) | Missing | No signature fields | signature_text, signature_at | Add columns; capture in intake | P0 |
| SP-AUDIT-01 | Status timeline with name + time | Missing | Single status, no history | status_events table or JSONB | Add status_events (job_id, status, by_role, by_name, at) | P0 |
| SP-DM-01 | Inventory deducted, validated at order | Missing | No quantity | quantity on strings; decrement on insert; check before insert | Add quantity; trigger or app logic to deduct and validate | P0 |
| SP-DM-02 | Designed for Shopify | Unknown | No integration code | — | Keep product/job IDs and API shape extensible | P2 |
| SP-DM-03 | Roles: Customer, FD, Manager, Stringer, Admin | Missing | No auth/roles | Supabase Auth + profiles.role | Add auth and role column or profiles.role | P0 |
| SP-DM-04 | RLS by role | Missing | Anyone policies | Per-table policies by role | Replace “Anyone” with role-based SELECT/INSERT/UPDATE/DELETE | P0 |
| SP-ERR-01 | Correction order (ticket+C, same stringer, labor=0) | Missing | No correction flow | correction_order or flag, parent_job_id | Add correction order type and finance flag; reporting | P1 |

---

## TASK 4 — MVP Scope for Can-Am Demo

### Constraints (from brief)

- No Shopify; “designed to support” only.  
- Payment Phase 1: front desk confirmation only (record payment status).  
- Notifications: email-only for MVP if no SMS.  
- Ticket: CANAMYYMMXXX, California local time.  
- Out-of-stock not selectable; low stock &lt;5 highlighted.  
- Rush: 1-day +$10, 2-hour +$20; Special Stringer A +$10.  
- Pickup due 10 days; overdue → “Waiting Pickup”.  
- Waiver: acknowledgment + typed signature + timestamp.  
- Status timeline with staff/stringer name + time.

### MVP user journeys

**Customer**  
1. Open site → Drop-Off.  
2. Fill intake: contact, racket, string (only in-stock; low stock &lt;5 highlighted), tension, optional stencil/grip/grommet, rush, stringer A (+$10).  
3. See waiver, type signature, submit.  
4. See confirmation with ticket CANAMYYMMXXX, “Ready in 48h”, “Pick up within 10 days”.  
5. (Optional) Visit /status, enter ticket + email, see status and timeline.

**Front desk**  
1. Log in (role front_desk).  
2. See queue of jobs (e.g. “processing” / “received”).  
3. When racket arrives: mark “Received by Front Desk”, enter name, confirm waiver.  
4. (Optional) Upload 1–2 photos (racket head, condition).  
5. At pickup: verify identity, confirm payment, record release (name, time), set “Pickup Completed”.

**Stringing manager**  
1. Log in (role stringing_manager).  
2. See jobs needing string prep.  
3. Allocate string (from inventory), mark “Ready for Stringing” with name and time.  
4. Inventory deducted on allocation (or at job creation if single-step MVP).

**Stringer**  
1. Log in (role stringer).  
2. See queue (e.g. “ready_for_stringing”) sorted by due date / rush.  
3. Mark “Received by Stringer” with name and time.  
4. When done, mark “Completed / Ready for Pickup” with name and time.

**Admin**  
1. Log in (role admin).  
2. Manage strings: price, quantity, restock (optional).  
3. See all jobs and timeline.  
4. (MVP optional) Basic report: count by period/stringer.

### MVP data model (tables + columns)

| Table | Key columns (new or changed) |
|-------|------------------------------|
| **strings** (extend) | + `price` (numeric), `quantity` (int), `restock_date` (date, optional), `color` (text, optional) |
| **racquet_jobs** (extend) | + `ticket_number` (text, unique, CANAMYYMMXXX), `rush_type` ('none'\|'1day'\|'2hr'), `stringer_option` ('default'\|'stringer_a'), `grommet_repair` (boolean), `stencil_request`, `grip_addon`, `signature_text`, `signature_at` (timestamptz), `payment_status` ('pending'\|'confirmed'), `payment_confirmed_at`, `released_by`, `released_at`; change pickup_deadline rule to drop_in_date + 10 days |
| **status_events** (new) | `id` (UUID), `job_id` (FK racquet_jobs), `status` (text: received_front_desk, ready_for_stringing, received_by_stringer, completed, pickup_completed, waiting_pickup), `by_role`, `by_name`, `at` (timestamptz) |
| **profiles** (new, if Auth) | `id` (auth.uid), `role` ('customer'\|'front_desk'\|'stringing_manager'\|'stringer'\|'admin'), `display_name` |
| **job_attachments** (optional) | `job_id`, `url`, `type`, `created_at` |

Pricing: compute from string price + rush (+$10 / +$20) + stringer A (+$10). Store `total_amount` on racquet_jobs or derive for display.

### MVP routes/pages

| Route | Page | Who |
|-------|------|-----|
| `/` | Drop-Off (intake + waiver + signature) | Public |
| `/status` | Status lookup (ticket + email) | Public |
| `/admin` | Dashboard (racquets, strings, optional reports) | Admin |
| `/front-desk` | Queue + receive + pickup actions | Front desk |
| `/manager` | Allocation + “Ready for Stringing” | Stringing manager |
| `/stringer` | Queue + receive + complete | Stringer |

(Admin may also be allowed on /front-desk or /manager for demo.)

### MVP RLS rules summary (who can see what)

| Resource | Customer (anon) | Front desk | Stringing manager | Stringer | Admin |
|----------|-----------------|------------|-------------------|----------|-------|
| strings (read) | Yes (for intake) | Yes | Yes | Yes | Yes |
| strings (write) | No | No | Quantity only (optional) | No | Yes |
| racquet_jobs (insert) | Yes (intake only) | No | No | No | Yes |
| racquet_jobs (read) | Own job by ticket+email only | All jobs | All jobs | All jobs | All jobs |
| racquet_jobs (update) | No | Receive, pickup, payment | Ready for stringing | Receive, complete | All |
| status_events (read) | Own job only | All | All | All | All |
| status_events (insert) | No | Yes (on status change) | Yes | Yes | Yes |
| Reports | No | No | No | No | Yes |

Customer “own job” read: enforce via RLS or edge function that allows SELECT only when `ticket_number` + `email` match request (no auth required for status lookup).

### Conflicting implementations (single source of truth)

| Conflict | Current code | Doc | Recommendation |
|----------|--------------|-----|----------------|
| Pickup deadline | `drop_in_date + 3` days in `DropOff.tsx` (lines 124–125) and `api.ts` (lines 80–86) | Pickup required within **10 days** | Use **10 days** everywhere: change to `dropDateObj.setDate(dropDateObj.getDate() + 10)` and same in api.ts. |
| Expected completion | Not shown | “Expected stringing completion time (regular: **48 hours**)” | Show “Ready in 48 hours” and “Pick up within 10 days” on confirmation and status. |
| Status labels | Admin: “Complete”, “Delivered” | “Completed / Ready for Pickup”, “Pickup Completed”, “Waiting Pickup” | Align status enum/labels: e.g. `completed` = “Ready for Pickup”, `pickup_completed` = “Pickup Completed”, `waiting_pickup` = “Waiting Pickup”. Keep single status field plus timeline for attribution. |
| Ticket ID | `id` is UUID only | CANAMYYMMXXX | Add `ticket_number` as display ID; keep UUID as primary key. |

---

## TASK 5 — Implementation Plan (Backlog)

### 1) Database migrations + RLS

| Title | Files | Acceptance criteria | Complexity |
|-------|-------|---------------------|------------|
| Add ticket_number (CANAMYYMMXXX) and sequence | New migration | Unique ticket_number, generated in California time on insert | M |
| Extend strings: price, quantity, restock_date | New migration | Columns added; backfill price/quantity | S |
| Extend racquet_jobs: rush, stringer, grommet, stencil, grip, signature, payment, released_* | New migration | All new columns; nullable where appropriate | M |
| Create status_events table | New migration | job_id, status, by_role, by_name, at; index on job_id | S |
| Add auth.profiles + role | New migration + Supabase Auth | profiles.role; trigger to create profile on signup | M |
| RLS policies for strings (admin write) | Same or new migration | Only admin (and optionally manager) can INSERT/UPDATE/DELETE | M |
| RLS policies for racquet_jobs by role | Same or new migration | SELECT/UPDATE by role as per MVP RLS summary | L |
| RLS for status_events | Same or new migration | Insert/select by allowed roles | S |
| Customer status lookup (by ticket + email) | RLS or edge function | Public can read one job when ticket_number + email match | S |

### 2) Backend / API

| Title | Files | Acceptance criteria | Complexity |
|-------|-------|---------------------|------------|
| Ticket number generator (California time) | Migration (function) or edge | Next CANAMYYMMXXX per month; call on racquet_jobs insert | M |
| createRacquet: validate string in stock, deduct quantity | `src/lib/api.ts` or RPC | Reject if quantity &lt; 1; decrement on success | M |
| createRacquet: store signature, rush, stringer, extras | `src/lib/api.ts` | Map new form fields to new columns | S |
| createRacquet: set pickup_deadline = drop_in_date + 10 days | `src/lib/api.ts` | Replace +3 with +10 | S |
| updateStatusWithAttribution: insert status_events, update job status | `src/lib/api.ts` or RPC | Single function for FD/manager/stringer transitions | M |
| Fetch job by ticket + email (for status page) | `src/lib/api.ts` | Return job + status_events for display | S |
| Overdue job: set status to waiting_pickup (cron or nightly) | Edge function or cron | After pickup_deadline + 10 days, set status | S |

### 3) UI pages / components

| Title | Files | Acceptance criteria | Complexity |
|-------|-------|---------------------|------------|
| Intake: show only in-stock strings; highlight low stock &lt;5 | `DropOff.tsx`, api | Filter quantity &gt; 0; style for quantity &lt; 5 | S |
| Intake: rush options, Stringer A, grommet, stencil, grip | `DropOff.tsx`, types | Fields and validation; price summary | M |
| Intake: waiver text + typed signature + timestamp | `DropOff.tsx` | Waiver copy, input for signature, send signature_text, signature_at | M |
| Intake: display “Ready in 48h”, “Pick up within 10 days” and ticket on success | `DropOff.tsx` | Success view shows ticket_number and messaging | S |
| Status lookup page /status | New page + route | Form ticket + email; show status and timeline | M |
| Admin: strings – price, quantity, restock (optional) | `Admin.tsx` | Table and edit dialog | M |
| Admin: status dropdown aligned to timeline (e.g. received_front_desk, ready_for_stringing, …) | `Admin.tsx`, types | Status list and transitions with attribution | M |
| Front desk page: receive, waiver confirm, pickup, payment | New page | Buttons/forms for receive and pickup; set payment_confirmed, released_* | L |
| Manager page: allocate string, “Ready for Stringing” | New page | List jobs; mark ready with manager name | M |
| Stringer page: receive, complete | New page | List jobs; receive and complete with stringer name | M |
| DueStatusBadge: “Waiting Pickup” when status = waiting_pickup | `DueStatusBadge.tsx` | Show label for overdue/waiting pickup | S |

### 4) Notification jobs (cron / edge)

| Title | Files | Acceptance criteria | Complexity |
|-------|-------|---------------------|------------|
| Reminders days 7–10 (email) | Supabase edge or external cron | Send email when within 7–10 days of pickup_deadline; set reminder_*_sent | M |
| Overdue → waiting_pickup | Same or separate | Run daily; set status for jobs past pickup_deadline + 10 days | S |

### 5) Testing checklist

- Intake: submit with all options; ticket format CANAMYYMMXXX; 10-day pickup; signature and waiver stored.  
- Intake: out-of-stock string not selectable; low stock highlighted.  
- Front desk: receive with name/time; status_events created; pickup with payment and released_*.  
- Manager: “Ready for stringing” with name; inventory deducted at allocation or at create.  
- Stringer: receive and complete with name; timeline shows all steps.  
- Admin: strings CRUD with price/quantity; only admin can edit (with auth).  
- Status page: ticket + email returns correct job and timeline.  
- Overdue: after 10 days status becomes waiting_pickup (manual or cron).  
- RLS: anonymous can only create job and read own via ticket+email; roles see only what they should.

---

## Top 10 P0 Fixes to Be Demo-Ready

1. **Ticket number CANAMYYMMXXX** – Add `ticket_number` and generator (California time); show on confirmation.  
2. **Pickup deadline 10 days** – Change from +3 to +10 days in `createRacquet` and DropOff.  
3. **Status timeline + attribution** – Add `status_events` and use it for “Received by Front Desk”, “Received by Stringer”, “Ready for Stringing”, “Completed”, “Pickup Completed” with name and time.  
4. **Waiver + typed signature** – Add `signature_text` and `signature_at`; capture in intake and show waiver text.  
5. **Inventory: quantity + out-of-stock** – Add `quantity` to strings; do not allow selection when 0; validate and deduct on order.  
6. **Low stock &lt;5 highlighted** – In string dropdown, show or style when quantity &lt; 5.  
7. **Rush + Stringer A pricing** – Add `rush_type` (1-day +$10, 2-hour +$20) and stringer option (+$10); show in form and total.  
8. **“Waiting Pickup” after 10 days** – Add status `waiting_pickup`; auto-set when past pickup_deadline + 10 days (cron or manual for demo).  
9. **Front desk receive + pickup** – Front desk page (or admin section): mark received with staff name; at pickup confirm payment and set “Pickup Completed” with staff and time.  
10. **Roles + RLS** – Introduce auth and roles (admin, front_desk, stringing_manager, stringer); replace “Anyone” RLS with role-based policies so demo can show correct views per role.

---

*End of audit. Implement in the order that unblocks the demo (e.g. DB + ticket + timeline first, then intake extensions, then FD/manager/stringer pages, then notifications).*
