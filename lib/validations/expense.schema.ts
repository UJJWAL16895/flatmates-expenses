import { z } from 'zod';

export const createExpenseSchema = z.object({
  group_id: z.string().uuid(),
  description: z.string().min(1, 'Description is required').max(500),
  total_amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['INR', 'USD']),
  exchange_rate: z.number().positive('Exchange rate must be positive').optional(),
  split_type: z.enum(['equal', 'exact', 'percentage', 'shares']),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  category: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paid_by_user_id: z.string().uuid('Invalid payer'),
  splits: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number().optional(),
    percentage: z.number().min(0).max(100).optional(),
    units: z.number().int().positive().optional(),
  })).min(1, 'At least one split is required'),
}).refine(
  (data) => {
    if (data.currency === 'USD' && !data.exchange_rate) {
      return false;
    }
    return true;
  },
  { message: 'Exchange rate is required for USD expenses', path: ['exchange_rate'] }
);

export const updateExpenseSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid().optional(),
  description: z.string().min(1).max(500).optional(),
  total_amount: z.number().positive().optional(),
  currency: z.enum(['INR', 'USD']).optional(),
  exchange_rate: z.number().positive().optional(),
  split_type: z.enum(['equal', 'exact', 'percentage', 'shares']).optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paid_by_user_id: z.string().uuid().optional(),
  splits: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number().optional(),
    percentage: z.number().min(0).max(100).optional(),
    units: z.number().int().positive().optional(),
  })).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
