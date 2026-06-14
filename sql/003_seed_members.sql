-- ============================================================
-- Seed Data: 6 Flatmates + Default Group
-- ============================================================
-- Timeline:
--   Feb 2026: Aisha, Rohan, Priya, Meera (original flatmates)
--   Mar 2026: Dev joins for Goa trip (temporary)
--   End Mar:  Meera moves out (left_at = 2026-03-31)
--   Mid Apr:  Sam moves in (joined_at = 2026-04-08)
-- ============================================================

-- Password for all seed users: "password123"
-- bcrypt hash of "password123" with 10 rounds
-- $2b$10$rQZ8kHw5Y5z5z5z5z5z5zOWGq5Z5z5z5z5z5z5z5z5z5z5z5z5z

-- Insert users with deterministic UUIDs for easy referencing
INSERT INTO users (id, email, name, password_hash, avatar_color) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'aisha@flatmates.app', 'Aisha', '$2b$10$EIXkPQxZmTpZ3sJzDPQz4eHxkpQsLqJxLJ6Y3Rz3F7dQ3sP1E7Uu6', '#8b5cf6'),
  ('b2222222-2222-2222-2222-222222222222', 'rohan@flatmates.app', 'Rohan', '$2b$10$EIXkPQxZmTpZ3sJzDPQz4eHxkpQsLqJxLJ6Y3Rz3F7dQ3sP1E7Uu6', '#06b6d4'),
  ('c3333333-3333-3333-3333-333333333333', 'priya@flatmates.app', 'Priya', '$2b$10$EIXkPQxZmTpZ3sJzDPQz4eHxkpQsLqJxLJ6Y3Rz3F7dQ3sP1E7Uu6', '#f59e0b'),
  ('d4444444-4444-4444-4444-444444444444', 'meera@flatmates.app', 'Meera', '$2b$10$EIXkPQxZmTpZ3sJzDPQz4eHxkpQsLqJxLJ6Y3Rz3F7dQ3sP1E7Uu6', '#ec4899'),
  ('e5555555-5555-5555-5555-555555555555', 'dev@flatmates.app',   'Dev',   '$2b$10$EIXkPQxZmTpZ3sJzDPQz4eHxkpQsLqJxLJ6Y3Rz3F7dQ3sP1E7Uu6', '#10b981'),
  ('f6666666-6666-6666-6666-666666666666', 'sam@flatmates.app',   'Sam',   '$2b$10$EIXkPQxZmTpZ3sJzDPQz4eHxkpQsLqJxLJ6Y3Rz3F7dQ3sP1E7Uu6', '#f97316')
ON CONFLICT (email) DO NOTHING;

-- Create default group
INSERT INTO groups (id, name, created_by) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Flatmates', 'a1111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Add members with correct date ranges
-- Original 4 flatmates: joined Feb 1, 2026
INSERT INTO group_members (group_id, user_id, joined_at, left_at, invited_by) VALUES
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-1111-1111-111111111111', '2026-02-01', NULL, NULL),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-2222-2222-222222222222', '2026-02-01', NULL, NULL),
  ('00000000-0000-0000-0000-000000000000', 'c3333333-3333-3333-3333-333333333333', '2026-02-01', NULL, NULL),
  -- Meera: joined Feb 1, LEFT March 31
  ('00000000-0000-0000-0000-000000000000', 'd4444444-4444-4444-4444-444444444444', '2026-02-01', '2026-03-31', NULL),
  -- Dev: joined Mar 8 for Goa trip, left Mar 14
  ('00000000-0000-0000-0000-000000000000', 'e5555555-5555-5555-5555-555555555555', '2026-03-08', '2026-03-14', NULL),
  -- Sam: joined Apr 8 (moved in mid-April)
  ('00000000-0000-0000-0000-000000000000', 'f6666666-6666-6666-6666-666666666666', '2026-04-08', NULL, NULL)
ON CONFLICT DO NOTHING;
