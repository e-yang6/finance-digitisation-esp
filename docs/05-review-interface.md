# Review Interface (`/review/[id]`)

Individual submission review page. Click-to-sign replaces email chains and file conversions.

---

## Top Bar

Full-width navy `#1B2A4A` strip:
- Left: "Reviewing: {reference_number} • {applicant_name} • ${total} • {vendor}"
- Center: Status badge — e.g. "Pending Review" in yellow
- Right: "Officer Dashboard" button (white outline, returns to `/dashboard`)

---

## Two-Column Layout

Grid: `grid-cols-[1fr_1fr]` on desktop, single column stacked on mobile.

---

### Left Column — Receipt Review

**Receipt Card** (styled like a physical receipt):
- Header: `{VENDOR NAME}` (all caps, bold)
- Sub-header: `{vendor_address}`
- Divider line
- Items table:

| Item | Amount | HST |
|------|--------|-----|
| Binders (x2) | $15.76 | $1.82 |
| Dry-erase Markers | $12.39 | $1.43 |
| Lined paper | $14.63 | $1.69 |
| SUBTOTAL | $42.78 | |
| HST | $4.94 | |
| ADDITIONAL EXPENSES | $0.00 | |
| **TOTAL** | **$47.72** | |

Total row: bold, navy bg `#1B2A4A`, white text.

**OCR Verification Section** (below receipt card):
- Green background (`bg-green-50`), green border
- Header: "OCR VERIFICATION" in green
- Checks: "Vendor ✓", "Total ✓", "Items ✓"
- Summary: "All fields matched" in green text
- If mismatch detected: show "⚠ Manual review recommended" in yellow

**Receipt Image** (below OCR section):
- Thumbnail of uploaded receipt image
- "View Full Size" link opens modal

---

### Right Column — Requisition Details

**Details Card:**
| Label | Value |
|-------|-------|
| Applicant | Alex Chen |
| Email | alex.chen@mail.utoronto.ca |
| Committee | ECE Club |
| Reason | Office supplies for common room. |
| Submitted | March 10, 2026 at 2:34 PM |
| Amount | $47.72 |
| Reference | CR-2026-0381 |

---

### Dual Approval Signatures (right column, below details)

**Signature 1 — Finance Committee**
- State: **pending** → dashed grey border, "Pending" text, grey bg
- State: **signed** → solid green border, officer name + timestamp, green bg, "✓ Signed" label

**Arrow indicator** (→) between boxes

**Signature 2 — Senior Exec**
- State: **pending** → dashed grey border
- State: **signed** → solid green border

**Interactive Signing Box:**
```
┌─────────────────────────────────────┐
│  Click to add electronic signature  │  ← dashed border, pointer cursor
│          [Signature Icon]           │
└─────────────────────────────────────┘
```
- Clicking records: `officer_id`, `signed_at`, `signature_order` (1 or 2)
- **Rule 1**: Signature 2 cannot be added by the same officer who signed Signature 1 (enforced on server: `UNIQUE(submission_id, officer_id)`)
- **Rule 2**: Signature 2 requires Signature 1 to exist first
- **Status auto-update**: 1 sig → `awaiting_vp`; 2 sigs → `approved`

---

### Action Buttons

```
[ APPROVE ]   [ REJECT ]
  (green)       (red)
```

- **APPROVE**: disabled until both signatures are present; calls `PATCH /api/submissions/{id}/approve`
- **REJECT**: available any time; calls `PATCH /api/submissions/{id}/reject`; logs `review_completed_at`

**Note to Applicant (Optional):**
- Textarea below buttons, max 500 chars
- Content stored in `rejection_note` column (add to schema)
- Sent via email on rejection

---

## Review Time Tracking

- `review_started_at`: set to `NOW()` when officer navigates to `/review/[id]` for the first time (server-side via `GET /api/submissions/[id]`)
- `review_completed_at`: set on APPROVE or REJECT action
- `review_duration_seconds`: computed as `EXTRACT(EPOCH FROM (review_completed_at - review_started_at))`
- Used by `GET /api/stats/review-time` for validation reporting

---

## Responsive Behaviour

- Desktop (≥768px): two-column layout
- Mobile (<768px): single column, receipt card first, then details + signatures
