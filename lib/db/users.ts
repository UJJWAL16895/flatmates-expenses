import pool from './connection';
import type { User, UserPublic } from '@/types';

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<UserPublic | null> {
  const result = await pool.query(
    'SELECT id, email, name, avatar_color, avatar_url, active_group_id, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string,
  avatarColor?: string,
  avatarUrl?: string
): Promise<UserPublic> {
  const color = avatarColor || `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  const result = await pool.query(
    `INSERT INTO users (email, name, password_hash, avatar_color, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, avatar_color, avatar_url, active_group_id, created_at`,
    [email, name, passwordHash, color, avatarUrl || null]
  );
  return result.rows[0];
}

export async function getAllUsers(): Promise<UserPublic[]> {
  const result = await pool.query(
    'SELECT id, email, name, avatar_color, avatar_url, active_group_id, created_at FROM users ORDER BY name'
  );
  return result.rows;
}

export async function findUserByName(name: string): Promise<UserPublic | null> {
  const result = await pool.query(
    'SELECT id, email, name, avatar_color, avatar_url, active_group_id, created_at FROM users WHERE LOWER(name) = LOWER($1)',
    [name]
  );
  return result.rows[0] || null;
}

export async function getActiveGroupId(userId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT active_group_id FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.active_group_id || null;
}

export async function setActiveGroupId(userId: string, groupId: string): Promise<void> {
  await pool.query(
    'UPDATE users SET active_group_id = $2 WHERE id = $1',
    [userId, groupId]
  );
}
