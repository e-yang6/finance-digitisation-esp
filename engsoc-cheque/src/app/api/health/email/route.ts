import { transporter } from '@/lib/email';

export async function GET() {
  const config = {
    SMTP_HOST: process.env.SMTP_HOST || '(default: smtp.gmail.com)',
    SMTP_PORT: process.env.SMTP_PORT || '(default: 587)',
    SMTP_USER: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}...` : '(not set)',
    SMTP_PASS: process.env.SMTP_PASS ? '(set)' : '(not set)',
    SMTP_FROM: process.env.SMTP_FROM || '(not set)',
  };

  try {
    await transporter.verify();
    return Response.json({ status: 'ok', config });
  } catch (err) {
    return Response.json(
      { status: 'error', error: (err as Error).message, config },
      { status: 500 }
    );
  }
}
