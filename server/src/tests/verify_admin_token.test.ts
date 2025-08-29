import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminUsersTable } from '../db/schema';
import { verifyAdminToken } from '../handlers/verify_admin_token';

// Helper function to create a JWT token manually for testing
const createTestToken = async (payload: any, secret: string = 'default-secret-key'): Promise<string> => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
};

// Test admin user data
const testAdminUser = {
  username: 'testadmin',
  email: 'admin@test.com',
  password_hash: 'hashed_password_123'
};

describe('verifyAdminToken', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return admin user for valid token', async () => {
    // Create test admin user
    const adminResult = await db.insert(adminUsersTable)
      .values(testAdminUser)
      .returning()
      .execute();
    
    const adminUser = adminResult[0];
    
    // Create valid token
    const payload = {
      sub: adminUser.id,
      username: adminUser.username,
      exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
    };
    
    const token = await createTestToken(payload);
    
    // Verify token
    const result = await verifyAdminToken(token);
    
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(adminUser.id);
    expect(result!.username).toEqual('testadmin');
    expect(result!.email).toEqual('admin@test.com');
    expect(result!.password_hash).toEqual('hashed_password_123');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for expired token', async () => {
    // Create test admin user
    const adminResult = await db.insert(adminUsersTable)
      .values(testAdminUser)
      .returning()
      .execute();
    
    const adminUser = adminResult[0];
    
    // Create expired token
    const payload = {
      sub: adminUser.id,
      username: adminUser.username,
      exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    };
    
    const token = await createTestToken(payload);
    
    // Verify token
    const result = await verifyAdminToken(token);
    
    expect(result).toBeNull();
  });

  it('should return null for token with invalid signature', async () => {
    // Create test admin user
    const adminResult = await db.insert(adminUsersTable)
      .values(testAdminUser)
      .returning()
      .execute();
    
    const adminUser = adminResult[0];
    
    // Create token with wrong secret
    const payload = {
      sub: adminUser.id,
      username: adminUser.username,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const token = await createTestToken(payload, 'wrong-secret');
    
    // Verify token (should fail due to signature mismatch)
    const result = await verifyAdminToken(token);
    
    expect(result).toBeNull();
  });

  it('should return null for malformed token', async () => {
    const malformedTokens = [
      'invalid.token',
      'invalid.token.signature.extra',
      'not-a-jwt-at-all',
      '',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-payload.signature'
    ];
    
    for (const token of malformedTokens) {
      const result = await verifyAdminToken(token);
      expect(result).toBeNull();
    }
  });

  it('should return null for token with non-existent user', async () => {
    // Create token for user ID that doesn't exist
    const payload = {
      sub: 99999, // Non-existent user ID
      username: 'nonexistent',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const token = await createTestToken(payload);
    
    // Verify token
    const result = await verifyAdminToken(token);
    
    expect(result).toBeNull();
  });

  it('should return null for token without user ID', async () => {
    // Create token without sub/userId field
    const payload = {
      username: 'testuser',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const token = await createTestToken(payload);
    
    // Verify token
    const result = await verifyAdminToken(token);
    
    expect(result).toBeNull();
  });

  it('should return null for token with invalid user ID type', async () => {
    // Create token with string user ID instead of number
    const payload = {
      sub: 'invalid-id',
      username: 'testuser',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const token = await createTestToken(payload);
    
    // Verify token
    const result = await verifyAdminToken(token);
    
    expect(result).toBeNull();
  });

  it('should return null for null/undefined token', async () => {
    expect(await verifyAdminToken('')).toBeNull();
    expect(await verifyAdminToken(null as any)).toBeNull();
    expect(await verifyAdminToken(undefined as any)).toBeNull();
  });

  it('should handle token without expiration field', async () => {
    // Create test admin user
    const adminResult = await db.insert(adminUsersTable)
      .values(testAdminUser)
      .returning()
      .execute();
    
    const adminUser = adminResult[0];
    
    // Create token without exp field
    const payload = {
      sub: adminUser.id,
      username: adminUser.username
    };
    
    const token = await createTestToken(payload);
    
    // Verify token (should work since no expiration check)
    const result = await verifyAdminToken(token);
    
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(adminUser.id);
    expect(result!.username).toEqual('testadmin');
  });

  it('should work with userId field instead of sub', async () => {
    // Create test admin user
    const adminResult = await db.insert(adminUsersTable)
      .values(testAdminUser)
      .returning()
      .execute();
    
    const adminUser = adminResult[0];
    
    // Create token with userId instead of sub
    const payload = {
      userId: adminUser.id,
      username: adminUser.username,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const token = await createTestToken(payload);
    
    // Verify token
    const result = await verifyAdminToken(token);
    
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(adminUser.id);
    expect(result!.username).toEqual('testadmin');
  });
});