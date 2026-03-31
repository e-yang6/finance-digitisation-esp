# EngSoc Cheque Requisition System

Digitises the University of Toronto Engineering Society's paper-based cheque requisition (SF1) workflow. Officers review submissions through a centralized dashboard with dual e-signature approval. Applicants upload receipts, which are OCR-processed via Amazon Textract to auto-fill form fields.

---

## Project Structure

```
engsoc-cheque/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page
│   │   ├── (auth)/register/       # Registration page
│   │   ├── apply/                 # 3-step applicant wizard
│   │   │   ├── page.tsx           #   Step 1: Upload Receipt
│   │   │   ├── form/page.tsx      #   Step 2: Fill Form
│   │   │   └── review/page.tsx    #   Step 3: Review & Submit
│   │   ├── dashboard/page.tsx     # Officer dashboard
│   │   └── review/[id]/page.tsx   # Individual submission review
│   ├── api/                       # API routes
│   ├── components/                # React components
│   ├── lib/
│   │   ├── db.ts                  # PostgreSQL connection pool
│   │   ├── db/migrate.sql         # Database schema
│   │   ├── db/seed.ts             # Seed script
│   │   ├── auth.ts                # NextAuth config
│   │   ├── textract.ts            # Amazon Textract OCR
│   │   └── email.ts               # Nodemailer email
│   └── types/index.ts             # TypeScript types
├── .env.local                     # Environment variables (gitignored)
├── package.json
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL |
| OCR | Amazon Textract |
| Auth | NextAuth.js v5 (credentials provider) |
| Email | Nodemailer + SMTP |

---
