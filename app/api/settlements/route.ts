import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSettlement, getSettlementsByGroup } from '@/lib/db/settlements';
import { z } from 'zod';

const createSettlementSchema = z.object({
  group_id: z.string().uuid(),
  paid_by_user_id: z.string().uuid(),
  paid_to_user_id: z.string().uuid(),
  amount_inr: z.number().positive('Amount must be positive'),
  settled_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'group_id is required' }, { status: 400 });
    }

    const settlements = await getSettlementsByGroup(groupId);

    return NextResponse.json({ success: true, data: settlements });
  } catch (error) {
    console.error('GET /api/settlements error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSettlementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const settlement = await createSettlement(
      parsed.data.group_id,
      parsed.data.paid_by_user_id,
      parsed.data.paid_to_user_id,
      parsed.data.amount_inr,
      parsed.data.settled_at,
      parsed.data.notes || null,
      userId
    );

    return NextResponse.json({ success: true, data: settlement }, { status: 201 });
  } catch (error) {
    console.error('POST /api/settlements error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
