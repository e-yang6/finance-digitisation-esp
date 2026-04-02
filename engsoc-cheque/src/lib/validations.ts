import { z } from 'zod';

const registerRoleSchema = z.enum(['applicant', 'officer']);

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .refine(
      (email) => /^.+@gmail\.com$/i.test(email),
      'Registration is restricted to Gmail addresses (@gmail.com)'
    ),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  committee: z.string().trim().optional(),
  role: registerRoleSchema.default('applicant'),
}).refine(
  (data) => data.role === 'officer' || Boolean(data.committee),
  {
    message: 'Committee/Club is required',
    path: ['committee'],
  }
);

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const submissionSchema = z.object({
  vendor: z.string().min(1, 'Vendor is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  useOfFunds: z.string().min(1, 'Use of funds is required'),
  subtotal: z.number().min(0),
  hst: z.number().min(0),
  additionalExpenses: z.number().min(0).default(0),
  total: z.number().min(0),
  lineItems: z.array(
    z.object({
      description: z.string().min(1),
      amount: z.number().min(0),
      hst: z.number().min(0),
    })
  ),
  receiptBase64: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
