# EngSoc Cheque Requisition System

Digitises the University of Toronto Engineering Society's paper-based cheque requisition (SF1) workflow. Officers review submissions through a centralized dashboard with dual e-signature approval. Applicants upload receipts, which are OCR-processed via Amazon Textract to auto-fill form fields.

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v20 or later | [nodejs.org](https://nodejs.org/) |
| **npm** | Comes with Node.js | — |
| **Docker Desktop** | Latest | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |

> **Don't want Docker?** You can install [PostgreSQL](https://www.postgresql.org/download/) directly instead. See [Option B](#option-b-postgresql-installed-directly) below.

---

## Quick Start (step by step)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd finance-digitisation-esp
```

### 2. Install dependencies

```bash
cd engsoc-cheque
npm install
```

### 3. Start PostgreSQL

#### Option A: Docker (recommended)

1. Open **Docker Desktop** and wait until the engine says **"Running"**.
2. Run this command **once** to create and start a Postgres container:

```bash
docker run --name engsoc-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=engsoc_cheque -p 5432:5432 -d postgres:16
```

3. Verify it's running:

```bash
docker ps
```

You should see a container named `engsoc-pg` with port `5432`.

**Useful Docker commands for later:**

```bash
# Stop the database when you're done for the day
docker stop engsoc-pg

# Start it again next time (don't re-run "docker run")
docker start engsoc-pg
```

#### Option B: PostgreSQL installed directly

1. Download and install PostgreSQL from [postgresql.org/download](https://www.postgresql.org/download/).
2. During installation, set the superuser password to `postgres` (or change the `.env.local` to match).
3. Open **pgAdmin** or **psql** and create a database:

```sql
CREATE DATABASE engsoc_cheque;
```

### 4. Create the `.env.local` file

Inside the `engsoc-cheque/` folder, create a file called `.env.local` with this content:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/engsoc_cheque

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-replace-in-production

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** AWS and SMTP keys are **not required** for local development. OCR and email features will be unavailable without them, but everything else works. See [Optional: Enable OCR & Email](#optional-enable-ocr--email) below.

### 5. Run database migration & seed

From inside `engsoc-cheque/`:

```bash
npx ts-node src/lib/db/seed.ts
```

This will:
- Create all database tables (`users`, `submissions`, `line_items`, `signatures`)
- Insert sample users and submissions

You should see:

```
🌱 Seeding database...
✅ Schema created
✅ Users inserted
✅ Submissions inserted
✅ Line items inserted
✅ Signatures inserted
🎉 Seeding complete!
```

> **Ignore the warning** about `MODULE_TYPELESS_PACKAGE_JSON` — it doesn't affect anything.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Accounts

The seed script creates the following accounts you can log in with:

### Officers (access the dashboard + review submissions)

| Name | Email | Password |
|------|-------|----------|
| Sarah Mitchell | `sarah.mitchell@utoronto.ca` | `officer123` |
| David Park | `david.park@utoronto.ca` | `officer123` |

### Applicants (submit cheque requisitions)

| Name | Email | Password |
|------|-------|----------|
| Alex Chen | `alex.chen@mail.utoronto.ca` | `applicant123` |
| Jamie Park | `jamie.park@mail.utoronto.ca` | `applicant123` |
| Liam Hartley | `liam.hartley@mail.utoronto.ca` | `applicant123` |
| Priya Nair | `priya.nair@mail.utoronto.ca` | `applicant123` |

---

## Dev Mode Features

When running locally (`NODE_ENV=development`), a **"Skip with Demo Data"** button appears on the receipt upload page. This lets you bypass the OCR step with placeholder receipt data so you can test the full applicant flow without AWS credentials.

---

## Optional: Enable OCR & Email

To enable Amazon Textract OCR and email notifications, add these to your `.env.local`:

```env
# AWS (Textract) — required for receipt OCR
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1

# SMTP — required for email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@engsoc.skule.ca
```

Without these keys:
- **OCR** (`/api/ocr`) will return a 500 error — use the "Skip with Demo Data" button instead
- **Emails** won't send, but submissions and approvals/rejections still work normally (email send is non-blocking)

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

## Troubleshooting

### `docker run` fails with "cannot find file specified"
Docker Desktop isn't running. Open it from the Start menu, wait for "Engine running", then retry.

### `docker run` fails with "name already in use"
The container already exists. Just start it:
```bash
docker start engsoc-pg
```

### Seed fails with "connection refused"
PostgreSQL isn't running. Start Docker Desktop and run `docker start engsoc-pg`, or start your local Postgres service.

### Seed fails with "date/time field value out of range"
The seed data contained an invalid date. Pull the latest code — this has been fixed.

### `__dirname is not defined`
The seed script runs as ESM. Pull the latest code — this has been fixed.

### Warning about `MODULE_TYPELESS_PACKAGE_JSON`
Harmless. Ignore it.

### Login fails with "Invalid credentials"
Make sure the seed ran successfully (you should see `🎉 Seeding complete!`). Use the exact emails and passwords from the [Test Accounts](#test-accounts) section.

