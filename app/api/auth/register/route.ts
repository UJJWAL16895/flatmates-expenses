import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUser, findUserByEmail } from '@/lib/db/users';
import { createSampleDataForUser } from '@/lib/db/seed';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message || 'Invalid input';
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    const { name, email, password, avatar_url } = validation.data;

    // Check if email already registered
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email is already registered' },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await createUser(email, name, passwordHash, undefined, avatar_url);

    // Seed sample data for user (also sets active_group_id to this sample group)
    try {
      await createSampleDataForUser(newUser.id);
    } catch (seedError) {
      console.error('Failed to seed sample data for new user:', seedError);
      // We don't block registration if seeding fails, but logging is good.
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            avatar_url: newUser.avatar_url,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
