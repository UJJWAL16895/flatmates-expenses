import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGroupBalances } from '@/lib/db/balances';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = await params;
    const { balances, suggestions } = await getGroupBalances(groupId);

    return NextResponse.json({
      success: true,
      data: { balances, suggestions },
    });
  } catch (error) {
    console.error('GET /api/balances/[groupId] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
