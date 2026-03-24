# EngSoc Cheque Requisition System — Overview

## Project Summary & Objective

The EngSoc Cheque Requisition System digitises the University of Toronto Engineering Society's paper-based cheque requisition (SF1) workflow. Currently, officers spend approximately **480 minutes/week** reviewing and processing ~30 submissions manually. The system targets **270 minutes/week** — a 44% reduction — by:

1. **OCR autofill** (Amazon Textract): Receipt vendor, date, line items, and totals are extracted automatically, eliminating manual data transcription.
2. **Profile pre-fill**: Applicant name, email, and committee auto-populate form fields on every submission.
3. **Centralized dashboard**: Replaces scattered emails/files with a single officer review interface featuring click-to-sign dual approval.

**Target metric**: ≤ 9 min/submission average review duration (validated over a two-week prototype test).

---

## Validation Plan

| Phase | Duration | Method |
|-------|----------|--------|
| Prototype test | 2 weeks | Developer measures `review_duration_seconds` per submission |
| Target | — | Average ≤ 9 min (540 seconds) across all submissions |
| Baseline | — | ~480 min ÷ 30 submissions = ~16 min/submission |

The system logs `review_started_at` when an officer opens a submission and `review_completed_at` on approve/reject. `GET /api/stats/review-time` returns average, min, and max review duration for reporting.

---

## Tech Stack & Justifications

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React.js + Next.js 14 App Router | Familiar to UofT CS/ECE students; App Router simplifies layout/auth |
| Language | TypeScript | Type safety reduces runtime errors in form data handling |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI assembly with accessible components |
| Database | AWS Lightsail PostgreSQL | Managed, low-cost (~$15/mo included in bundle), familiar SQL |
| OCR | Amazon Textract | 94.2% character recognition accuracy; processes well-scanned receipts in ~0.7s |
| Auth | NextAuth.js credentials provider | JWT sessions; easy UofT email domain restriction |
| Email | Nodemailer + SMTP | Confirmation emails to applicants on submission |
| Hosting | AWS Lightsail | ~$7/month; same AWS account as Textract reduces IAM complexity |
| Font | DM Sans | Clean, modern sans-serif appropriate for a university administrative tool |

---

## Prototype Scope

1. Receipt image upload (JPG/PNG, max 5 MB)
2. Amazon Textract OCR extraction → vendor, date, line items, totals
3. 3-page applicant wizard: Upload → Fill Form → Review & Submit
4. Officer dashboard with stats and submission table
5. Individual submission review with dual e-signature approval
6. Review time telemetry for validation

---

## Full Project Folder Structure

```
engsoc-cheque/
├── .env.local                          # Environment variables (gitignored)
├── .env.local.example                  # Template committed to repo
├── .github/
│   └── workflows/
│       └── deploy.yml                  # GitHub Actions → Lightsail
├── docs/                               # Spec files (this folder)
│   ├── 01-overview.md
│   ├── 02-auth.md
│   ├── 03-applicant-flow.md
│   ├── 04-officer-dashboard.md
│   ├── 05-review-interface.md
│   ├── 06-backend-api.md
│   ├── 07-database.md
│   └── 08-deployment.md
├── prisma/                             # Not used — raw pg queries
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout, DM Sans font
│   │   ├── page.tsx                    # Redirect → /login
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── apply/
│   │   │   ├── page.tsx                # Step 1 — Upload Receipt
│   │   │   ├── form/
│   │   │   │   └── page.tsx            # Step 2 — Fill Form
│   │   │   └── review/
│   │   │       └── page.tsx            # Step 3 — Review & Submit
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Officer Dashboard
│   │   └── review/
│   │       └── [id]/
│   │           └── page.tsx            # Individual submission review
│   ├── api/                            # Next.js API routes (App Router)
│   │   └── (all under app/api/)
│   ├── components/
│   │   ├── ui/                         # shadcn/ui generated components
│   │   ├── Header.tsx
│   │   ├── ProgressStepper.tsx
│   │   ├── OcrResultsCard.tsx
│   │   ├── LineItemsTable.tsx
│   │   ├── SignatureBox.tsx
│   │   ├── StatusBadge.tsx
│   │   └── StatsCard.tsx
│   ├── lib/
│   │   ├── db.ts                       # pg Pool singleton
│   │   ├── auth.ts                     # NextAuth config
│   │   ├── textract.ts                 # Textract client + parser
│   │   ├── email.ts                    # Nodemailer transporter
│   │   ├── validations.ts              # Zod schemas
│   │   └── utils.ts                    # cn(), formatCurrency(), generateRef()
│   └── types/
│       └── index.ts                    # Shared TypeScript types
├── public/
│   └── uoft-crest.svg
├── middleware.ts                        # Route protection
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## .env.local Template

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/engsoc_cheque

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32

# AWS (Textract)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@engsoc.skule.ca

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `users` | Applicants and officers; stores hashed password, committee, role |
| `submissions` | Each cheque requisition with status, totals, review timing |
| `line_items` | Individual receipt line items linked to a submission |
| `signatures` | Dual e-signatures; enforces sequential order and different officers |

See `docs/07-database.md` for full DDL and seed data.
