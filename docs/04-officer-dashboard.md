# Officer Dashboard (`/dashboard`)

Centralized dashboard replacing the current unstructured submission process.

---

## Layout

### Header
- Background: `#1B2A4A` navy
- Left: "EngSoc Cheque Requisition" (white, DM Sans bold)
- Right: "Officer Dashboard" label (white), avatar circle + "Logout" button

### Logged-In Bar
- Left: `{officer name}` + `{officer email}` in small white/muted text
- Right: Role badge — e.g. "VP Finance" in gold/yellow pill (`#D4A017` or `#F59E0B` bg, dark text)

---

## Stats Row (4 Cards)

| Card | Label | Value Source |
|------|-------|-------------|
| 1 | Pending Review | `SELECT COUNT(*) FROM submissions WHERE status = 'pending'` |
| 2 | Awaiting VP Signature | `SELECT COUNT(*) FROM submissions WHERE status = 'awaiting_vp'` |
| 3 | Approved This Week | `SELECT COUNT(*) FROM submissions WHERE status = 'approved' AND review_completed_at >= date_trunc('week', NOW())` |
| 4 | Total Money Distributed | `SELECT SUM(total) FROM submissions WHERE status = 'approved'` |

Card design: white bg, rounded, shadow, large number top, label below, subtle left-border color:
- Pending: blue (`#3B82F6`)
- Awaiting VP: gold (`#F59E0B`)
- Approved: green (`#22C55E`)
- Total: navy (`#1B2A4A`)

---

## Submissions Table

**Header row:** "CHEQUE REQUISITION REVIEW" uppercase, grey background, navy text

**Columns:** Applicant | Committee | Vendor | Amount | Date | Status | Actions

**Sample rows:**

| Applicant | Committee | Vendor | Amount | Date | Status |
|-----------|-----------|--------|--------|------|--------|
| Alex Chen | ECE Club | Staples Canada | $47.72 | 03/10/26 | PENDING REVIEW |
| Jamie Park | Hi-Skule | Home Depot | $289.68 | 03/06/26 | AWAITING VP SIG |
| Liam Hartley | Levy Funding | Personal | $10.90 | 03/02/26 | APPROVED |
| Priya Nair | Skule Nite | Indigo Canada | $68.87 | 02/29/26 | REJECTED |

**Actions column:** "Review →" link button for pending/awaiting rows; "View" for approved/rejected.

### Status Badge Styles

| Status | Badge Style |
|--------|------------|
| PENDING REVIEW | Blue outline (`border-blue-500 text-blue-600`) |
| AWAITING VP SIG | Gold/yellow fill (`bg-yellow-100 text-yellow-800`) |
| APPROVED | Green fill (`bg-green-100 text-green-800`) |
| REJECTED | Red fill (`bg-red-100 text-red-800`) |

---

## Pagination & Filtering

- Default: show 10 most recent submissions, sorted by `submitted_at DESC`
- "SEE ALL RECORDS" link at bottom → loads full table (no pagination)
- Future: add filter by status, committee, date range (out of prototype scope)

---

## Navigation

- Clicking any row → `/review/{submission_id}`
- "Officer Dashboard" button in header is current page indicator (no navigation)
- Logout → clears NextAuth session → redirect to `/login`

---

## Real-Time Updates

- Dashboard polls `GET /api/submissions` every 30 seconds (simple interval — no WebSockets in prototype)
- New submissions appear without full page reload
