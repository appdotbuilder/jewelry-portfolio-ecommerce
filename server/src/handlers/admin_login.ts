import { db } from '../db';
import { adminUsersTable } from '../db/schema';
import { type AdminLoginInput } from '../schema';
import { eq } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

export async function adminLogin(input: AdminLoginInput): Promise<{ token: string } | null> {
  try {
    // Find admin user by username
    const adminUsers = await db.select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, input.username))
      .execute();

    if (adminUsers.length === 0) {
      return null; // User not found
    }

    const admin = adminUsers[0];

    // Verify password using Bun's built-in password verification
    const isPasswordValid = await Bun.password.verify(input.password, admin.password_hash);
    
    if (!isPasswordValid) {
      return null; // Invalid password
    }

    // Generate JWT token
    const secret = process.env['JWT_SECRET'] || 'default-secret-key';
    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username,
        email: admin.email 
      },
      secret,
      { expiresIn: '24h' }
    );

    return { token };
  } catch (error) {
    console.error('Admin login failed:', error);
    throw error;
  }
}