# Deployment

## Infrastructure

| Resource | Service | Cost |
|----------|---------|------|
| App server | AWS Lightsail Container Service (Nano) | ~$7/month |
| Database | AWS Lightsail Managed PostgreSQL | Included in bundle or ~$15/month standalone |
| OCR | Amazon Textract | Pay-per-use (~$0.0015/page; negligible at 30 submissions/week) |
| Email | Gmail SMTP (free tier) | $0 |
| **Total** | | **~$7–22/month** |

---

## AWS Lightsail Setup

### Container Service

1. Create Lightsail Container Service: `engsoc-cheque`, Nano ($7/month), scale 1
2. Build Docker image locally or via GitHub Actions
3. Push to Lightsail Container Registry
4. Deploy with environment variables set in Lightsail console

### Managed PostgreSQL

1. Create Lightsail database: PostgreSQL 14, $15/month plan
2. Note connection string → `DATABASE_URL`
3. Allow Lightsail container service to connect (same VPC region)
4. Run `src/lib/db/migrate.sql` via psql or Lightsail query editor
5. Run seed script: `npx ts-node src/lib/db/seed.ts`

---

## Amazon Textract IAM

Create an IAM user with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "textract:DetectDocumentText",
        "textract:AnalyzeDocument"
      ],
      "Resource": "*"
    }
  ]
}
```

Store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in environment variables — **never hardcode in source**.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/engsoc` |
| `NEXTAUTH_URL` | Full URL of deployed app | `https://engsoc-cheque.yourdomain.com` |
| `NEXTAUTH_SECRET` | JWT signing secret (32+ chars) | `openssl rand -base64 32` |
| `AWS_ACCESS_KEY_ID` | Textract IAM access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Textract IAM secret | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS region for Textract | `us-east-1` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP login email | `noreply@engsoc.skule.ca` |
| `SMTP_PASS` | SMTP app password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | From address in emails | `EngSoc Cheque System <noreply@engsoc.skule.ca>` |
| `NEXT_PUBLIC_APP_URL` | Public app URL for links in emails | `https://engsoc-cheque.yourdomain.com` |

---

## Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Add to `next.config.js`:
```js
output: 'standalone'
```

---

## GitHub Actions Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Lightsail

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Install Lightsail plugin
        run: |
          curl https://s3.us-west-2.amazonaws.com/lightsailctl/latest/linux-amd64/lightsailctl \
            -o /usr/local/bin/lightsailctl
          chmod +x /usr/local/bin/lightsailctl

      - name: Build Docker image
        run: docker build -t engsoc-cheque:latest .

      - name: Push to Lightsail registry
        run: |
          aws lightsail push-container-image \
            --service-name engsoc-cheque \
            --label latest \
            --image engsoc-cheque:latest

      - name: Deploy container
        run: |
          aws lightsail create-container-service-deployment \
            --service-name engsoc-cheque \
            --containers '{
              "app": {
                "image": ":engsoc-cheque.latest.1",
                "ports": {"3000": "HTTP"},
                "environment": {
                  "NODE_ENV": "production",
                  "NEXTAUTH_URL": "${{ secrets.NEXTAUTH_URL }}",
                  "NEXTAUTH_SECRET": "${{ secrets.NEXTAUTH_SECRET }}",
                  "DATABASE_URL": "${{ secrets.DATABASE_URL }}",
                  "AWS_ACCESS_KEY_ID": "${{ secrets.AWS_TEXTRACT_KEY_ID }}",
                  "AWS_SECRET_ACCESS_KEY": "${{ secrets.AWS_TEXTRACT_SECRET }}",
                  "AWS_REGION": "us-east-1",
                  "SMTP_HOST": "${{ secrets.SMTP_HOST }}",
                  "SMTP_PORT": "587",
                  "SMTP_USER": "${{ secrets.SMTP_USER }}",
                  "SMTP_PASS": "${{ secrets.SMTP_PASS }}",
                  "SMTP_FROM": "${{ secrets.SMTP_FROM }}",
                  "NEXT_PUBLIC_APP_URL": "${{ secrets.NEXTAUTH_URL }}"
                }
              }
            }' \
            --public-endpoint '{"containerName":"app","containerPort":3000,"healthCheck":{"path":"/api/health"}}'
```

**GitHub Secrets to configure:**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — for Lightsail deployment
- `AWS_TEXTRACT_KEY_ID`, `AWS_TEXTRACT_SECRET` — for Textract (can be same key if policy allows both)
- `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## Nodemailer Configuration

```ts
// src/lib/email.ts
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

---

## Health Check

`GET /api/health` → returns `{ "status": "ok", "timestamp": "..." }` for load balancer and deployment verification.
