/**
 * GET /api/user/active-group — Return the user's active group ID + is_sample flag
 * PUT /api/user/active-group — Switch the user's active group
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveGroupId, setActiveGroupId } from '@/lib/db/users';
import { getGroups } from '@/lib/db/groups';
import pool from '@/lib/db/connection';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    let activeGroupId = await getActiveGroupId(userId);

    // If no active group set, fall back to first group
    if (!activeGroupId) {
      const groups = await getGroups(userId);
      if (groups.length > 0) {
        activeGroupId = groups[0].id;
        await setActiveGroupId(userId, activeGroupId);
      }
    }

    if (!activeGroupId) {
      return NextResponse.json({
        success: true,
        data: { group_id: null, is_sample: false, group_name: null },
      });
    }

    // Get group details including is_sample
    const groupResult = await pool.query(
      'SELECT id, name, is_sample FROM groups WHERE id = $1 AND deleted_at IS NULL',
      [activeGroupId]
    );
    const group = groupResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        group_id: group?.id || null,
        is_sample: group?.is_sample || false,
        group_name: group?.name || null,
      },
    });
  } catch (error) {
    console.error('GET /api/user/active-group error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { group_id } = body;

    if (!group_id) {
      return NextResponse.json({ success: false, error: 'group_id is required' }, { status: 400 });
    }

    // Verify user is a member of this group
    const memberCheck = await pool.query(
      `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, userId]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not a member of this group' }, { status: 403 });
    }

    await setActiveGroupId(userId, group_id);

    // Return updated group info
    const groupResult = await pool.query(
      'SELECT id, name, is_sample FROM groups WHERE id = $1',
      [group_id]
    );
    const group = groupResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        group_id: group.id,
        is_sample: group.is_sample || false,
        group_name: group.name,
      },
    });
  } catch (error) {
    console.error('PUT /api/user/active-group error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
