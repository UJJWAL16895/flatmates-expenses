import { z } from 'zod';

export const resolveAnomalySchema = z.object({
  anomaly_id: z.string().uuid(),
  resolution: z.enum(['approved', 'rejected', 'modified']),
  resolver_notes: z.string().optional(),
  // For modifications — user-provided corrected data
  corrected_data: z.object({
    paid_by: z.string().optional(),
    amount: z.number().optional(),
    currency: z.enum(['INR', 'USD']).optional(),
    exchange_rate: z.number().positive().optional(),
    date: z.string().optional(),
    split_with: z.array(z.string()).optional(),
    split_details: z.string().optional(),
    action: z.enum([
      'keep_first',
      'keep_second',
      'keep_both',
      'import_as_settlement',
      'skip',
      'import_as_refund',
      'import_anyway',
      'confirm_inr',
      'set_to_usd',
      'normalize_percentages',
      'remove_nonmember',
      'add_temp_member',
      'remove_inactive',
      'treat_as_equal',
      'treat_as_shares',
      'set_exchange_rate',
    ]).optional(),
  }).optional(),
});

export const commitImportSchema = z.object({
  session_id: z.string().uuid(),
});

export type ResolveAnomalyInput = z.infer<typeof resolveAnomalySchema>;
export type CommitImportInput = z.infer<typeof commitImportSchema>;
