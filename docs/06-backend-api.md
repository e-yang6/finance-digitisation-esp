# Backend API Routes

All routes under `/api/` using Next.js 14 App Router (`src/app/api/.../route.ts`).

---

## Authentication Routes

### `POST /api/auth/register`

Create a new user account.

**Request body:**
```json
{
  "name": "Alex Chen",
  "email": "alex.chen@mail.utoronto.ca",
  "password": "securepassword",
  "committee": "ECE Club",
  "role": "applicant"
}
```

**Validation:**
- Email must match `/^.+@(mail\.)?utoronto\.ca$/i`
- Password ≥ 8 characters
- Email must be unique

**Response 201:**
```json
{ "message": "Account created successfully" }
```

**Response 400:**
```json
{ "error": "Registration is restricted to UofT email addresses." }
```

**Implementation:**
1. Validate with Zod
2. Check email uniqueness
3. `bcrypt.hash(password, 12)`
4. `INSERT INTO users ...`

---

### `POST /api/auth/[...nextauth]`

Handled by NextAuth.js. See `docs/02-auth.md`.

---

## OCR Route

### `POST /api/ocr`

Receive a base64-encoded image, call Amazon Textract, parse and return structured data.

**Request body:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
  "contentType": "image/jpeg"
}
```

**Implementation:**
1. Decode base64 to `Buffer`
2. Call `textract.analyzeDocument({ Document: { Bytes: buffer }, FeatureTypes: ['TABLES', 'FORMS'] })`
3. Record `Date.now()` before and after call → compute `processingTimeMs`
4. Parse response:
   - Extract VENDOR from FORMS key-value pairs or first bold text block
   - Extract DATE from FORMS
   - Extract line items from TABLE blocks (description, amount, HST columns)
   - Sum subtotal, HST, total from table footer rows
5. Return structured JSON

**Response 200:**
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
  "total": 47.72
}
```

**Response 500:** Textract error message.

---

## Submissions Routes

### `POST /api/submissions`

Create a new submission.

**Auth:** Required (applicant role)

**Request body:**
```json
{
  "vendor": "Staples Canada",
  "purchaseDate": "2026-03-10",
  "useOfFunds": "Office supplies for common room.",
  "subtotal": 42.78,
  "hst": 4.94,
  "additionalExpenses": 0,
  "total": 47.72,
  "lineItems": [...],
  "receiptBase64": "data:image/jpeg;base64,..."
}
```

**Implementation:**
1. Generate reference: `CR-{YYYY}-{NNNN}` — query max ref for year, increment
2. Decode receipt base64 → BYTEA
3. `BEGIN` transaction
4. INSERT into `submissions`
5. INSERT each line item into `line_items`
6. `COMMIT`
7. Send confirmation email via Nodemailer
8. Return `{ referenceNumber, submissionId }`

**Response 201:**
```json
{ "referenceNumber": "CR-2026-0005", "submissionId": "uuid" }
```

---

### `GET /api/submissions`

**Auth:** Required

**Behaviour:**
- Officers: return all submissions, sorted by `submitted_at DESC`
- Applicants: return only own submissions (`WHERE applicant_id = $1`)

**Response 200:** Array of submission objects (without `receipt_image` BYTEA for performance).

---

### `GET /api/submissions/[id]`

Return full submission detail including line items and signatures.

**Auth:** Required

**Side effect:** If officer role and `review_started_at IS NULL`, set `review_started_at = NOW()`.

**Response 200:**
```json
{
  "id": "uuid",
  "referenceNumber": "CR-2026-0381",
  "applicant": { "name": "Alex Chen", "email": "...", "committee": "ECE Club" },
  "vendor": "Staples Canada",
  "purchaseDate": "2026-03-10",
  "useOfFunds": "Office supplies for common room.",
  "subtotal": 42.78,
  "hst": 4.94,
  "additionalExpenses": 0,
  "total": 47.72,
  "status": "pending",
  "lineItems": [...],
  "signatures": [...],
  "submittedAt": "2026-03-10T14:34:00Z"
}
```

---

### `PATCH /api/submissions/[id]/approve`

Add a signature. Auto-updates status.

**Auth:** Officer role required

**Request body:**
```json
{ "signatureOrder": 1 }
```

**Implementation:**
1. Verify no existing signature from this officer on this submission
2. Verify sequential order (can't add sig 2 before sig 1)
3. INSERT into `signatures`
4. If `signature_order = 1`: UPDATE submissions SET status = 'awaiting_vp'
5. If `signature_order = 2`: UPDATE submissions SET status = 'approved', review_completed_at = NOW(), review_duration_seconds = EXTRACT(EPOCH FROM (NOW() - review_started_at))

**Response 400 (same officer):**
```json
{ "error": "You have already signed this submission." }
```

---

### `PATCH /api/submissions/[id]/reject`

Reject a submission.

**Auth:** Officer role required

**Request body:**
```json
{ "note": "Receipt does not match the requested amount." }
```

**Implementation:**
1. UPDATE submissions SET status = 'rejected', review_completed_at = NOW(), review_duration_seconds = EXTRACT(EPOCH FROM (NOW() - review_started_at))
2. Store note (add `rejection_note TEXT` column to submissions)
3. Send rejection email to applicant

**Response 200:**
```json
{ "message": "Submission rejected." }
```

---

## Dashboard Routes

### `GET /api/dashboard/stats`

Returns counts for the four stat cards.

**Auth:** Officer role required

**Response 200:**
```json
{
  "pendingReview": 1,
  "awaitingVpSignature": 1,
  "approvedThisWeek": 1,
  "totalMoneyDistributed": 10.90
}
```

---

## Validation Route

### `GET /api/stats/review-time`

Returns review duration statistics for the two-week validation period.

**Auth:** Officer role required

**Response 200:**
```json
{
  "averageSeconds": 487,
  "minSeconds": 180,
  "maxSeconds": 920,
  "totalReviewed": 12,
  "targetSeconds": 540,
  "onTarget": true
}
```

---

## Error Handling

All routes return consistent error shape:
```json
{ "error": "Human-readable message" }
```

HTTP status codes:
- `400` — validation error
- `401` — not authenticated
- `403` — wrong role
- `404` — resource not found
- `500` — server error
