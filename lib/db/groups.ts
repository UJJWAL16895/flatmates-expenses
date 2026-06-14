import pool from './connection';
import type { Group, GroupMember, GroupWithMembers, MembershipRange } from '@/types';

export async function createGroup(name: string, createdBy: string): Promise<Group> {
  const result = await pool.query(
    `INSERT INTO groups (name, created_by)
     VALUES ($1, $2)
     RETURNING *`,
    [name, createdBy]
  );
  return result.rows[0];
}

export async function getGroups(userId: string): Promise<Group[]> {
  const result = await pool.query(
    `SELECT g.* FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1 AND g.deleted_at IS NULL
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getGroupById(id: string): Promise<GroupWithMembers | null> {
  const groupResult = await pool.query(
    'SELECT * FROM groups WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (groupResult.rows.length === 0) return null;

  const membersResult = await pool.query(
    `SELECT gm.*, u.name AS user_name, u.email AS user_email, u.avatar_color
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at`,
    [id]
  );

  return {
    ...groupResult.rows[0],
    members: membersResult.rows,
  };
}

export async function updateGroup(id: string, name: string): Promise<Group> {
  const result = await pool.query(
    'UPDATE groups SET name = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING *',
    [id, name]
  );
  return result.rows[0];
}

export async function softDeleteGroup(id: string): Promise<void> {
  await pool.query(
    'UPDATE groups SET deleted_at = NOW() WHERE id = $1',
    [id]
  );
}

export async function addMember(
  groupId: string,
  userId: string,
  joinedAt: string,
  invitedBy?: string
): Promise<GroupMember> {
  const result = await pool.query(
    `INSERT INTO group_members (group_id, user_id, joined_at, invited_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [groupId, userId, joinedAt, invitedBy || null]
  );
  return result.rows[0];
}

export async function removeMember(
  groupId: string,
  userId: string,
  leftAt: string
): Promise<void> {
  await pool.query(
    `UPDATE group_members SET left_at = $3
     WHERE group_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [groupId, userId, leftAt]
  );
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const result = await pool.query(
    `SELECT gm.*, u.name AS user_name, u.email AS user_email, u.avatar_color
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at`,
    [groupId]
  );
  return result.rows;
}

export async function getActiveMembersOnDate(
  groupId: string,
  date: string
): Promise<GroupMember[]> {
  const result = await pool.query(
    `SELECT gm.*, u.name AS user_name, u.email AS user_email, u.avatar_color
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
       AND gm.joined_at <= $2
       AND (gm.left_at IS NULL OR gm.left_at >= $2)
     ORDER BY u.name`,
    [groupId, date]
  );
  return result.rows;
}

export async function getMembershipRanges(groupId: string): Promise<MembershipRange[]> {
  const result = await pool.query(
    `SELECT gm.user_id, u.name AS user_name, gm.joined_at, gm.left_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at`,
    [groupId]
  );
  return result.rows;
}
