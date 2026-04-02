import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendSubmissionConfirmation(params: {
  to: string;
  name: string;
  referenceNumber: string;
  vendor: string;
  total: number;
}) {
  const { to, name, referenceNumber, vendor, total } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'EngSoc Cheque System <noreply@engsoc.skule.ca>',
    to,
    subject: `Cheque Requisition Received — ${referenceNumber}`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B2A4A; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">EngSoc Cheque Requisition</h1>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">University of Toronto Engineering Society</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b; font-size: 16px;">Hi ${name},</p>
          <p style="color: #475569;">Your cheque requisition has been received and is pending officer review.</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Reference Number</p>
            <p style="margin: 0; color: #1B2A4A; font-size: 24px; font-weight: 700;">${referenceNumber}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Vendor</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: right; border-bottom: 1px solid #f1f5f9;">${vendor}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Total Requested</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">$${total.toFixed(2)}</td>
            </tr>
          </table>
          <p style="color: #475569; font-size: 14px; margin-top: 20px;">
            You will receive another email when your submission has been reviewed.
          </p>
          <a href="${appUrl}/apply" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-top: 8px;">Submit Another</a>
        </div>
      </div>
    `,
  });
}

export async function sendOfficerNewSubmissionNotification(params: {
  to: string;
  applicantName: string;
  referenceNumber: string;
  vendor: string;
  total: number;
}) {
  const { to, applicantName, referenceNumber, vendor, total } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'EngSoc Cheque System <noreply@engsoc.skule.ca>',
    to,
    subject: `New Cheque Requisition — ${referenceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B2A4A; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">EngSoc Cheque Requisition</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b;">A new cheque requisition has been submitted and is awaiting review.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Reference</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right; border-bottom: 1px solid #f1f5f9;">${referenceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Applicant</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: right; border-bottom: 1px solid #f1f5f9;">${applicantName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Vendor</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: right; border-bottom: 1px solid #f1f5f9;">${vendor}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Total</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">$${total.toFixed(2)}</td>
            </tr>
          </table>
          <a href="${appUrl}/dashboard" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-top: 24px;">Go to Dashboard</a>
        </div>
      </div>
    `,
  });
}

export async function sendApprovalNotification(params: {
  to: string;
  name: string;
  referenceNumber: string;
  vendor: string;
  total: number;
}) {
  const { to, name, referenceNumber, vendor, total } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'EngSoc Cheque System <noreply@engsoc.skule.ca>',
    to,
    subject: `Cheque Requisition Approved — ${referenceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B2A4A; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">EngSoc Cheque Requisition</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b;">Hi ${name},</p>
          <p style="color: #475569;">Your cheque requisition <strong>${referenceNumber}</strong> has been approved.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #16a34a; font-weight: 600;">Status: Approved</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Vendor</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: right; border-bottom: 1px solid #f1f5f9;">${vendor}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Total</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600; text-align: right;">$${total.toFixed(2)}</td>
            </tr>
          </table>
          <p style="color: #475569; font-size: 14px; margin-top: 20px;">Please follow up with the Finance Committee to arrange payment.</p>
          <a href="${appUrl}/apply" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; margin-top: 8px;">View Submissions</a>
        </div>
      </div>
    `,
  });
}

export async function sendRejectionNotification(params: {
  to: string;
  name: string;
  referenceNumber: string;
  note: string | null;
}) {
  const { to, name, referenceNumber, note } = params;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'EngSoc Cheque System <noreply@engsoc.skule.ca>',
    to,
    subject: `Cheque Requisition Update — ${referenceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B2A4A; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">EngSoc Cheque Requisition</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b;">Hi ${name},</p>
          <p style="color: #475569;">Your cheque requisition <strong>${referenceNumber}</strong> has been reviewed.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #dc2626; font-weight: 600;">Status: Rejected</p>
            ${note ? `<p style="margin: 8px 0 0; color: #7f1d1d; font-size: 14px;">${note}</p>` : ''}
          </div>
          <p style="color: #475569; font-size: 14px;">Please contact the Finance Committee if you have questions.</p>
        </div>
      </div>
    `,
  });
}
