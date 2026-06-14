import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db/connection';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const result = await pool.query(
          'SELECT id, email, name, password_hash, avatar_color, avatar_url FROM users WHERE email = $1',
          [credentials.email]
        );

        const user = result.rows[0];
        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarColor: user.avatar_color,
          avatarUrl: user.avatar_url,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.avatarColor = (user as { avatarColor?: string }).avatarColor;
        token.avatarUrl = (user as { avatarUrl?: string }).avatarUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { avatarColor: string }).avatarColor =
          token.avatarColor as string;
        (session.user as { avatarUrl?: string }).avatarUrl =
          token.avatarUrl as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/register',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
