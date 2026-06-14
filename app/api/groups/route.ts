import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createGroup } from '@/lib/db/groups';
import pool from '@/lib/db/connection';
import { createGroupSchema } from '@/lib/validations/group.schema';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const result = await pool.query(
      `SELECT g.*, g.is_sample FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1 AND g.deleted_at IS NULL
       ORDER BY g.is_sample ASC, g.created_at DESC`,
      [userId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/groups error:', error);
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
    const parsed = createGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const group = await createGroup(parsed.data.name, userId);

    return NextResponse.json({ success: true, data: group }, { status: 201 });
  } catch (error) {
    console.error('POST /api/groups error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
