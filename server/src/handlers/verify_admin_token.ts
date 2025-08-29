import { db } from '../db';
import { adminUsersTable } from '../db/schema';
import { type AdminUser } from '../schema';
import { eq } from 'drizzle-orm';

// JWT verification using Web Crypto API
export const verifyAdminToken = async (token: string): Promise<AdminUser | null> => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // Parse JWT token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header and payload
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));

    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // Verify signature using Web Crypto API
    const secretKey = process.env['JWT_SECRET'] || 'default-secret-key';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const signature = new Uint8Array(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(char => char.charCodeAt(0))
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);

    if (!isValid) {
      return null;
    }

    // Extract user ID from payload
    const userId = payload.sub || payload.userId;
    if (!userId || typeof userId !== 'number') {
      return null;
    }

    // Fetch admin user from database
    const adminUsers = await db.select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, userId))
      .limit(1)
      .execute();

    if (adminUsers.length === 0) {
      return null;
    }

    const adminUser = adminUsers[0];
    return {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      password_hash: adminUser.password_hash,
      created_at: adminUser.created_at,
      updated_at: adminUser.updated_at
    };

  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};