# MEMORY — Tahlia Manpower Recruitment SaaS

## Project Overview

A foreign employment agency management system for Ethiopian workers (mostly women in domestic work) placed with Saudi employers. Built for Tahlia Foreign Employment Agency, Addis Ababa.

**Core workflow:** Candidate → documents → Musaned/LMIS systems → medical → contract → wakalah (sponsorship fee) → visa → training → flight → deployment → after-care.

## Tech Stack

- **Runtime:** Vite + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Animation:** Framer Motion
- **Backend/Database:** Convex (serverless, real-time subscriptions)
- **Auth:** Convex Auth (email OTP + anonymous + dev bypass)
- **Routing:** React Router v7 (flat routes, lazy-loaded)
- **Icons:** Lucide React
- **Dates:** date-fns

## Routes

| Path | Page | Auth | Description |
|------|------|------|-------------|
| `/` | Landing | Public | Marketing landing page with hero, features, CTA |
| `/auth` | Auth | Public | Login/signup + demo one-click buttons |
| `/portal` | Portal | Public | Candidate portal: passport + PIN login |
| `/app` | AppShell | Auth | Protected shell with sidebar |
| `/app/dashboard` | Dashboard | Auth | Office overview: stats, alerts, recent activity |
| `/app/candidates` | Candidates | Auth | Candidate list with search & filters |
| `/app/candidates/:id` | CandidateDetail | Auth | Full file: progress steps, audit trail, tasks, fees |
| `/app/pipeline` | Pipeline | Auth | Kanban board by derived stage |
| `/app/documents` | Documents | Auth | Readiness gate: per-file checklist (passport, photos, certificates, admission) |
| `/app/employers` | Employers | Auth | Client & job order management |
| `/app/partners` | Partners | Auth | Saudi intermediaries: files, deployments, open orders, license & contact |
| `/app/fees` | Fees | Auth | Placement fee ledger (SAR) |
| `/app/expenses` | Expenses | Auth | Per-placement costs (medical, visa, travel, etc.) |
| `/app/tasks` | Tasks | Auth | Staff daily task records |
| `/app/deadlines` | Deadlines | Auth | Docketing board: expiring medicals/insurance, visas, fee due dates, task deadlines, deployment SLA |
| `/app/travel` | TravelDesk | Auth | Visa & travel desk: visa worklist (Tasheer/embassy/issued), flights, pre-departure training, gaps |
| `/app/aftercare` | Aftercare | Auth | Post-deployment desk: arrivals, first salary, grievances, returns |
| `/app/communications` | Communications | Auth | Messages desk: compose & send status updates/reminders (email/SMS/Telegram/in-app) to candidates/employers/staff/all candidates, saved templates, send log, unread inbound queue with mark-read |
| `/app/staff` | Staff | Auth | Performance by desk: workload, deployments, stuck files, weekly metrics |
| `/app/activity` | Activity | Auth | Office-wide audit trail: every logged action across all desks with team-member & action-type filters, summary tiles (entries, distinct actors, top action), linked candidate names |
| `/app/settings` | Settings | Auth | Office admin: agency profile & license expiry, subscription plan + usage vs limits, team management (owner/manager edits, staff read-only) |
| `/app/client` | ClientPortal | Auth | Saudi employer view: job orders + candidate progress |
| `*` | NotFound | Public | 404 |

## Convex Modules

| Module | Key Functions | Description |
|--------|--------------|-------------|
| `schema.ts` | 27+ tables | Full schema: auth, agencies, users, candidates, fees, expenses, tasks, clients, job orders, partners, procedures, documents, visas, departures, post-deployment, medical, training, communications, etc. |
| `candidates.ts` | `list`, `detail`, `timeline`, `create`, `update`, `advanceStage` | CRUD + 13-stage pipeline engine with audit trail |
| `pipeline.ts` | `deriveStage`, `deriveDepartment`, `statusFromPipeline` | 13-stage derivation from raw sheet values |
| `travel.ts` | `visaDesk`, `travelDesk`, `saveVisaApp`, `saveDeparture`, `saveTraining` | Visa & travel desk: worklist of files in visa stages joined to their visaApplications record (MOFA ref, biometrics, visa number/expiry, embassy), stuck/expiring flags, one-click next-step (PROCESSING→TASHEER→EMBASSY→RETURNED FROM EMBASSY→VISA ISSUED); departures + training certs; gap rows (issued-but-unbooked, booked-but-untrained). Mutations upsert the sub-table AND sync the candidate sheet (bookedFor/flightStat/training) with audit logging |
| `fees.ts` | `list`, `create`, `markPaid` | Placement fee ledger (SAR 6,500 per placement) |
| `expenses.ts` | `list`, `create`, `remove` | Per-candidate costs with summary by currency/type/payer |
| `tasks.ts` | `list`, `create`, `update` | Staff daily task records by department |
| `clients.ts` | `list`, `overview` | Saudi employer management + client portal data |
| `partners.ts` | `list`, `create` | Saudi-side intermediaries (PROs): per-partner files (matched via candidates.pro sheet column), deployments, job orders (via partnerAgencyId), license/contact. NOTE: table has no agencyId — partners are shared records. `create` logs an activity |
| `communications.ts` | `desk`, `createTemplate`, `send`, `markInboundRead` | Messages desk backend surfaced by `/app/communications`. `desk` returns templates, recent send log (40), unread inbound (clientMessages + candidateMessages joined to names), recipient pickers (candidates/clients), summary (sent this month, recipient count, templates, pending replies). `send` validates single recipients belong to the agency, inserts a `communicationLogs` row (status sent, recipientCount computed for all_candidates/staff), threads single-recipient sends into `candidateMessages`/`clientMessages` (readByAgency true), and logs an activity. `createTemplate` and `markInboundRead` are office-role gated |
| `activity.ts` | `list` | Office-wide audit trail surfaced by `/app/activity`: paginated `activities` rows joined to actor names (with fallback), optional actorId + action filters, summary (total entries, distinct actors, top action) and the distinct actor/action facet lists powering the filter selects. Every other module already writes to `activities`, so this is a read-only lens over existing data |
| `dashboard.ts` | `overview` | Aggregated stats, alerts, recent activity |
| `deadlines.ts` | `list` | Everything that expires or is due — medical certs, insurance, issued visas, arranged fees, staff tasks, 30-day deployment SLA. Returns items (kind, dueAt, daysLeft, status) + summary (overdue/dueSoon/upcoming/total) |
| `aftercare.ts` | `list`, `save`, `resolveGrievance`, `markSalaryReceived` | Post-deployment tracking: joins `postDeployment` to deployed candidates (no agencyId on the table — join via candidates), flags needing-intake/grievance-open/salary-pending as "attention", summary counts. All mutations write activity logs |
| `staff.ts` | `performance` | Per-staff report derived live: assigned/deployed files, conversion %, open/completed tasks, logged actions, stuck files (21d no movement), avg stage age — merged with the latest weekly `staffMetrics` row per user |
| `admin.ts` | `profile`, `updateAgency`, `team`, `addTeamMember`, `updateTeamMember` | Office administration backend surfaced by `/app/settings`: agency regulatory identity (license number/expiry → days-left, MOLS reg, bank guarantee), subscription → plan with live usage vs limits (staff/candidates/clients), team roster with live workload (assigned/deployed/actions/open tasks). Profile + team mutations are owner/manager-gated (super_admin allowed), all logged to activities |
| `seed.ts` | `run`, `reset`, `devBypass` | Demo data (40 candidates, 3 employers, 3 partners, 29 fees, 77 expenses, 8 tasks, 7 visa applications, 6 departures, 7 training certs, 3 aftercare records, 3 staffMetrics rows) + one-click demo login |
| `candidatePortal.ts` | `login`, `status` | Passport + PIN authentication for candidates |
| `alerts.ts` | — | Stuck file detection & alerts |
| `browse.ts` | `publicAgencies`, `publicCandidates` | Public directory queries |
| `helpers.ts` | `requireUser`, `requireAgency`, `requireRole`, `peopleMap` | Shared auth & utility functions |
| `users.ts` | `getCurrentUser` | Current user data retrieval |
| `pricing.ts` | `list` | Subscription plan tiers |

## Database Schema (Key Tables)

- **agencies** — agency name, code (TAHLIA01), license, contact
- **users** — name, email, role (super_admin, agency_owner, agency_manager, agency_staff, client), agencyId, clientId
- **candidates** — 40+ fields: personal info, passport, 13 raw pipeline columns (musStat, lmisStat, medical, wakalah, visaStatus, training, flightStat, etc.), assigned staff, audit trail fields, medicalExpiryDate, insuranceExpiryDate, deployedAt
- **clients** — Saudi employers: name, nitaqatColor, qiwaId, musanedEmployerId
- **jobOrders** — positions per client: quantity, filled, salary, requirements, partnerAgencyId
- **partnerAgencies** — Saudi-side intermediaries (PROs): name, code, country, contactPerson, email, phone, saudiLicenseNumber, isActive (no agencyId — shared records)
- **fees** — placement fees: amount, currency, status (arranged/paid), dueAt
- **candidateExpenses** — costs per placement: type, amount, paidBy (candidate/employer/agency)
- **staffTasks** — daily desk records: department, title, priority, status, dueDate, assigned userId
- **staffMetrics** — weekly per-user rows: totalActions, candidatesCreated, statusChanges, proceduresCompleted, documentsProcessed, candidatesAssigned, candidatesDeployed, conversionRate, avgStatusChangeTime, rejectionRate (indexed by_agency_period)
- **activities** — audit trail: action, description, userId, candidateId
- **auditLogs** — field-level change tracking: previousValue, newValue
- **postDeployment** — after-arrival tracking: arrivalConfirmationDate, employer feedback, firstMonthCheck, firstSalaryReceived/Date, grievanceReported/Resolved/Description, contractCompletionDate, contractRenewed, repatriationDate/Reason, returnStatus (on_site/completed/early_return/absconded). NOTE: no agencyId — join via candidates
- **departures** — flight bookings (flightNumber, departureDate, destination, status) per candidate
- **documents** — uploaded files per candidate/client
- **visaApplications** — detailed visa records (MOFA ref, biometrics, Tasheer id, visa number/issue/expiry, embassy, rejection reason). NOTE: status is lowercase enum (draft/submitted/processing/approved/issued/rejected), distinct from the candidate sheet's uppercase visaStatus
- **medicalExams** — lab results per candidate
- **trainingCertifications** — pre-departure training records (course, center, hours, cert number, status attended/passed/failed/retest)
- **candidateExtra** — admission form data (religion, emergency contacts, etc.)
- **subscriptions** — SaaS billing per agency
- **subscriptionPlans** — pricing tiers: free/starter/growth/enterprise
- **communicationTemplates** — saved messages (name, channel, type, subject, body) per agency
- **communicationLogs** — send log: channel, recipientType, recipientCount, subject, body, status (sent/failed/partial), sentAt, sentBy
- **clientMessages / candidateMessages** — portal threads: senderRole (client/candidate/agency), senderId, body, readByClient/Candidate + readByAgency

## Key Design Decisions

1. **13-stage pipeline** derived from raw sheet columns, not stored directly. `deriveStage()` in `pipeline.ts` reads `musStat`, `lmisStat`, `medical`, `wakalah`, `visaStatus`, `training`, `flightStat`, `documents` and computes the stage. This allows the raw sheet values to remain editable while keeping the derived stage in sync.
2. **Pipeline stages:** New Entry → Reception → Info Desk / Musaned → Contracted (E-PRO) → Medical → Ready for Wakalah → Wakalah Pending → Wakalah Paid → Visa Processing → Visa Issued → Flight Booked → Deployed → Exited (absolute)
3. **Departments:** Reception → Info Desk → Data Entry → Document Control → After-care. Derived from stage and sheet values.
4. **Auth:** Convex Auth with email OTP and anonymous auth. Dev bypass (`devBypass` mutation) for one-click demo role switching. Guarded by `DISABLE_DEV_BYPASS` env var.
5. **Authorization:** All office queries use `requireAgency()` which checks signed-in user + agency attachment. Role-based checks via `requireRole()`.
6. **Role routing:** AppShell is role-aware. Clients see `/app/client` (My orders), office roles see the full office sidebar. Redirects prevent cross-role access.
7. **Candidate portal:** Passport + 6-digit PIN login. No auth account needed. `candidatePortal.login` verifies passport + PIN, `status` returns derived stage, progress, and raw sheet values.
8. **Audit trail:** Every candidate mutation (`update`, `advanceStage`, `create`) writes to `activities` (summary) and `auditLogs` (field-level changes with before/after values). Nearly every other module's mutations also write `activities` rows — which is what makes the office-wide Activity log possible.
9. **Design theme:** Minimalism — near-monochrome palette, spacious, precise alignment, subtle dividers, intentional whitespace. Sidebar with brand mark, nav icons, user section.
10. **Seed data:** 40 candidates covering every pipeline stage, including edge cases (anomalies: documents withdrawn but medical FIT, deleted from Musaned but wakalah paid, departed with wakalah empty). Every mutation tests real pipeline logic.
11. **Deadlines docketing** (immigration-software style): `deadlines.list` derives everything that expires or is due from existing tables — medical certs (block deployment), placement insurance, issued-visa validity windows, arranged fee due dates, pending staff tasks, and the 30-day contract→deployment SLA — bucketed overdue/due-soon(≤14d)/upcoming.
12. **After-care desk** (closes the business loop): `aftercare.list` joins `postDeployment` records to DEPARTED/ARRIVED candidates of the agency and computes derived flags — needing-intake (no arrival confirmation), grievance-open, salary-pending — with an "attention" filter, plus a "returned" filter for early returns/completed. Quick actions (confirm salary, resolve grievance) sit next to each row.
13. **Staff performance desk** (recruiter-report standard from competitor research): `staff.performance` derives live per-user numbers — assigned/deployed files, conversion %, open/completed tasks, logged actions, stuck files (no movement 21+ days), avg stage age — from candidates/tasks/activities, and merges the latest seeded weekly `staffMetrics` row per user for "this week" figures. No extra tables needed beyond the schema's existing `staffMetrics`.
14. **Partners registry** (the Saudi intermediaries in the original brief): `partners.list` derives per-partner workload by matching candidates' `pro` sheet column (the PRO named on the file) and job orders' `partnerAgencyId` — files, active/deployed counts, open orders — alongside license and contact. The table is shared (no agencyId), so the office view lists all and computes stats.
15. **Visa & travel desk** (desks 3 & 4 of the brief): `travel.visaDesk` surfaces every file with a sheet visaStatus, joined to its latest `visaApplications` row — with days-in-stage, stuck flags (from `stuckInfo`), a ≤30-day expiry flag for issued visas, and a one-click next-step map (PROCESSING→TASHEER→EMBASSY→RETURNED FROM EMBASSY→VISA ISSUED) that calls `candidates.update` so the audit trail stays intact. `travel.travelDesk` lists departures + training certs and derives gap rows (issued-but-unbooked, booked-but-untrained) so the desk knows who's blocked. The travel mutations (`saveDeparture`, `saveTraining`) upsert the sub-table AND sync the candidate sheet (bookedFor/flightStat/training, re-deriving currentStatus through `statusFromPipeline`) so recording a flight on the desk legitimately moves the file.
16. **Office settings** (admin slice): `admin.profile` returns agency identity (license/MOLS/bank guarantee + days-to-license-expiry), subscription → plan, and live usage vs plan limits (staff/candidates/clients); `admin.team` returns members with live workload. `/app/settings` (nav: Settings) surfaces all three — profile grid with license-expiry warning, plan usage bars, team table with add/edit dialogs. Edit actions show only for owner/manager (super_admin allowed); staff sees read-only. Note: `subscription` and `plan` are nullable — the page renders a "No subscription on file" fallback and uses `?.` on `plan` limit lookups.
17. **Messages desk** (communications slice): `/app/communications` (nav: Messages) is the outbound/inbound hub. Compose panel sends via `communications.send` over 4 channels to one candidate/employer, all candidates, or office staff; single-recipient sends are also threaded into `candidateMessages`/`clientMessages` (readByAgency=true, readByCandidate/Client=false) so portals can consume them later. Templates are created in-app (`createTemplate`) — none are seeded. `markInboundRead` clears the "Needs a reply" queue, which surfaces unread portal messages joined to candidate/employer names. Frontend note: compose IDs are strings; cast to `Id<...>` at the `send` call site.
18. **Office audit trail** (activity slice): `/app/activity` (nav: Activity) is a read-only lens over the `activities` table that every desk already writes to — no new write paths. `activity.list` supports actorId + action filters and returns summary + facet lists; the page renders summary tiles, filter selects, and a feed with per-row icons/labels, relative time, and candidate links. This is the accountability layer that was missing: previously the audit trail was only visible inside a candidate's file.

## Demo Credentials

| Role | Email | How to access |
|------|-------|---------------|
| Agency owner | owner@manpowerpro.com | Click "Agency owner" on /auth |
| Agency manager | manager@manpowerpro.com | Click "Agency manager" on /auth |
| Agency staff | staff@manpowerpro.com | Click "Agency staff" on /auth |
| Client (employer) | fahad@alrajhi.sa | Click "Client" on /auth |
| Candidate portal | EP1000029 / 123456 | Click "Candidate portal" on landing or /auth |

## Seed Data Stats

- 1 agency (Tahlia Foreign Employment Agency)
- 3 partners (AL-MA CO., AL-MA WASATAH, JU CO.) — 1 job order each
- 1 client (Al Rajhi Family Services)
- 3 job orders (domestic workers, drivers, nannies) spread across the partners
- 40 candidates across all 13 stages
- 29 placement fees (SAR 6,500 each, arranged fees carry dueAt = arranged + 21d)
- 77 expenses (medical, visa, training, travel, documentation, insurance)
- 8 staff tasks assigned across the team (2 completed, one overdue)
- 7 visa applications: 3 issued with validity windows (one already expired) + 4 in-flight records (Tasheer/Embassy/Processing with MOFA refs and biometrics)
- 6 departures (3 departed — Getachew, Eyerusalem, Abel; 3 confirmed for the booked files)
- 7 pre-departure training certificates (6 passed + 1 attended)
- 3 post-deployment records: Getachew Mamo (on-site, salary paid), Eyerusalem Desta (on-site, grievance OPEN + salary pending), Abel Teshome (early return, repatriation scheduled)
- 3 staffMetrics weekly rows (owner/manager/staff) powering the Staff performance page
- Medical/insurance expiries on candidates (iso() offsets: 3d/12d/18d away, 2d/5d overdue)
- 4 subscription plans
- 11 procedure templates
- 2 announcements
- NOTE: no communication templates/logs/messages are seeded — the Messages desk starts empty and fills via in-app actions

## Environment Notes

- Runs in WebContainer (browser-based) — no Bun, use npm/npx
- `str_replace` is unreliable for file edits in this environment (confirmed repeatedly: it reports success but the change never reaches disk — even on the same file multiple times). Use `write_file` full-file rewrites for ALL persistence. Verify typos/edits with grep afterwards
- Terminal redirects (`> /tmp/...`) can corrupt project files — avoid
- `npx tsc -b --noEmit` has a known formatter crash in this environment (RangeError in error reporting) — this is NOT a real type error; Convex's own bundled TypeScript pass validates the code. Clear `node_modules/.tmp/tsconfig*.tsbuildinfo` if a phantom `TS5083: Cannot read file '/project/2/tsconfig.json'` appears
- The sync engine can replay a stale write into a just-created file path (e.g. `src/pages/Partners.tsx` receiving the `expenses.ts` module, `src/pages/Staff.tsx` receiving `deadlines.ts`). Recovery: `rm -f` the bad file, write the content to a fresh filename (e.g. `PartnersPage.tsx`), verify it on disk, then `mv` it into place
- The terminal blocks non-Convex commands while Convex files are mid-edit (compile gate): finish convex edits and run `npx convex dev --once && npx tsc -b --noEmit` before running anything else
- `npx convex dev --once` for pushing backend changes
- Never hand-edit `src/convex/_generated/*`
