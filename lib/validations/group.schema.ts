import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
});

export const addMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const removeMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  left_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
