# Applicant Flow — 3-Page Wizard

OCR autofill and profile pre-fill are the two mechanisms that eliminate manual entry and drive the time-reduction objective.

---

## PAGE 1 — Upload Receipt (`/apply`)

### Header
- Background: `#1B2A4A` navy
- Left: "EngSoc Cheque Requisition" (white, DM Sans)
- Center: "Page 1 of 3" (white, muted)
- Right: "Upload Receipt" button (white outline)

### Logged-In Bar
- Left: `{name}` + `{email}` in small text
- Right: "Applicant" badge — dark navy pill (`#1B2A4A` bg, white text)

### Progress Stepper
```
● ─────── ○ ─────── ○
1         2         3
(blue)   (grey)   (grey)
```
- Step 1: filled blue circle (active)
- Steps 2–3: grey empty circles

### Upload Zone
- Dashed border, rounded corners, light grey background
- Center icon: upload arrow (↑ into cloud)
- Primary text: "Drag & drop receipt, or click to browse"
- Secondary text: "JPG or PNG • Max 5 MB • Mobile Camera Supported"
- "Browse Files" button — navy outline, centered below text
- Accepts: `image/jpeg`, `image/png`
- Max size: 5 MB (5,242,880 bytes); reject oversized files client-side with error toast

### OCR Results Section (appears after upload)
Shown below the upload zone once Textract processing completes.

**Header row:**
- Left label: "OCR EXTRACTED DATA" (uppercase, small, grey)
- Right annotation: "Data extracted with Amazon Textract" (italic, small)
- Badge: "PROCESSED IN {time}ms" — green pill; `{time}` is the actual `ResponseMetadata` duration from Textract (not hardcoded)

**Extracted fields:**
- Vendor: `{vendor_name}`
- Date: `{purchase_date}` (MM/DD/YYYY)

**Items table:**

| Item Description | HST | Amount |
|-----------------|-----|--------|
| Binders (x2) | $1.82 | $15.76 |
| Dry-erase Markers | $1.43 | $12.39 |
| Lined paper | $1.69 | $14.63 |
| **SUBTOTAL** | | **$42.78** |
| **HST** | | **$4.94** |
| **TOTAL** | | **$47.72** |

Total row: bold, navy background (`#1B2A4A`), white text.

**Bottom annotation:** "Auto filled information needed for cheque requisition (SF1)"

### Navigation Buttons
- Left: "Re-Upload" — white bg, navy outline, navy text
- Right: "Continue →" — navy `#1B2A4A` bg, white text (disabled until OCR completes)

### State Management
OCR results stored in sessionStorage as `ocrData`:
```json
{
  "vendor": "Staples Canada",
  "date": "2026-03-10",
  "processingTimeMs": 712,
  "lineItems": [
    { "description": "Binders (x2)", "hst": 1.82, "amount": 15.76 },
    { "description": "Dry-erase Markers", "hst": 1.43, "amount": 12.39 },
    { "description": "Lined paper", "hst": 1.69, "amount": 14.63 }
  ],
  "subtotal": 42.78,
  "hst": 4.94,
  "total": 47.72,
  "receiptBase64": "..."
}
```

---

## PAGE 2 — Fill Form (`/apply/form`)

### Header
- Same navy header, "Page 2 of 3"
- Step 1 shows green checkmark ✓, Step 2 active blue, Step 3 grey

### Section: APPLICANT INFORMATION — AUTOFILLED FROM YOUR PROFILE
Label row: "APPLICANT INFORMATION" uppercase + annotation "AUTOFILLED FROM YOUR PROFILE" in blue/teal small text.

Fields (all read-only, grey background):
- **Payable To**: `{session.user.name}`
- **Email**: `{session.user.email}`
- **Committee/Club**: `{session.user.committee}`
- **Requested By**: `{session.user.name}`

### Section: PURCHASE DETAILS
- **Vendor**: pre-filled from OCR (editable)
- **Purchase Date**: pre-filled from OCR (editable date picker)
- **Use of Funds**: empty textarea, editable — placeholder: "Describe the purpose of this purchase..."

### Section: ITEMS PURCHASED — AUTOFILLED FROM RECEIPT
Label: "ITEMS PURCHASED" uppercase + annotation "AUTOFILLED FROM RECEIPT" in blue/teal small text.
- Pencil/edit icon top-right of section to enable inline editing
- Same table as OCR results, editable when edit mode active
- "Add Row" button at bottom of table when in edit mode

### Totals
| Label | Value |
|-------|-------|
| Subtotal | `$42.78` |
| HST | `$4.94` |
| Additional Expenses | `$0.00` (editable) |
| **TOTAL REQUESTED** | **`$47.72`** (bold, recalculated) |

### Navigation
- "Continue →" bottom-right (navy filled); validates required fields before proceeding

---

## PAGE 3 — Review & Submit (`/apply/review`)

### Header
- Same navy header, "Page 3 of 3"
- All three steps show green checkmarks

### Read-Only Summary

**APPLICANT INFORMATION:**
- Payable To, Email, Committee/Club, Requested By

**PURCHASE DETAILS:**
- Vendor, Purchase Date, Use of Funds

**ITEMS PURCHASED:**
- Same table, read-only

**TOTALS:**
- Subtotal, HST, Additional Expenses, TOTAL REQUESTED (bold)

### Submit Behaviour

On "Submit Application" button click:
1. POST to `/api/submissions` with all form data + receipt base64
2. Server generates reference number: `CR-YYYY-NNNN` (zero-padded, sequential per year)
3. Server sends confirmation email via Nodemailer to applicant email
4. On success: show confirmation page with reference number
5. Submission appears on officer dashboard immediately

### Confirmation State
- Green checkmark icon
- "Submission Received"
- Reference number: `CR-2026-NNNN` (large, navy)
- "A confirmation has been sent to {email}"
- "Submit Another" button
