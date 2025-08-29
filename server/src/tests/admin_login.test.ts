import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { adminUsersTable } from '../db/schema';
import { type AdminLoginInput } from '../schema';
import { adminLogin } from '../handlers/admin_login';
import * as jwt from 'jsonwebtoken';

// Test admin user data
const testAdminData = {
  username: 'testadmin',
  email: 'admin@test.com',
  password: 'testpassword123'
};

const testInput: AdminLoginInput = {
  username: 'testadmin',
  password: 'testpassword123'
};

describe('adminLogin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate valid admin credentials', async () => {
    // Create test admin user with hashed password
    const passwordHash = await Bun.password.hash(testAdminData.password);
    await db.insert(adminUsersTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: passwordHash
      })
      .execute();

    const result = await adminLogin(testInput);

    // Should return token object
    expect(result).not.toBeNull();
    expect(result!.token).toBeDefined();
    expect(typeof result!.token).toBe('string');

    // Verify token contains correct payload
    const secret = process.env['JWT_SECRET'] || 'default-secret-key';
    const decoded = jwt.verify(result!.token, secret) as any;
    expect(decoded.username).toBe(testAdminData.username);
    expect(decoded.email).toBe(testAdminData.email);
    expect(decoded.id).toBeDefined();
    expect(decoded.exp).toBeDefined(); // Should have expiration
  });

  it('should return null for non-existent username', async () => {
    const invalidInput: AdminLoginInput = {
      username: 'nonexistent',
      password: 'anypassword'
    };

    const result = await adminLogin(invalidInput);

    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    // Create test admin user
    const passwordHash = await Bun.password.hash(testAdminData.password);
    await db.insert(adminUsersTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: passwordHash
      })
      .execute();

    const invalidInput: AdminLoginInput = {
      username: testAdminData.username,
      password: 'wrongpassword'
    };

    const result = await adminLogin(invalidInput);

    expect(result).toBeNull();
  });

  it('should work with different admin users', async () => {
    // Create multiple admin users
    const admin1Hash = await Bun.password.hash('password1');
    const admin2Hash = await Bun.password.hash('password2');

    await db.insert(adminUsersTable)
      .values([
        {
          username: 'admin1',
          email: 'admin1@test.com',
          password_hash: admin1Hash
        },
        {
          username: 'admin2',
          email: 'admin2@test.com',
          password_hash: admin2Hash
        }
      ])
      .execute();

    // Test first admin login
    const result1 = await adminLogin({
      username: 'admin1',
      password: 'password1'
    });

    expect(result1).not.toBeNull();
    expect(result1!.token).toBeDefined();

    // Test second admin login
    const result2 = await adminLogin({
      username: 'admin2',
      password: 'password2'
    });

    expect(result2).not.toBeNull();
    expect(result2!.token).toBeDefined();

    // Tokens should be different
    expect(result1!.token).not.toBe(result2!.token);

    // Verify each token contains correct user data
    const secret = process.env['JWT_SECRET'] || 'default-secret-key';
    const decoded1 = jwt.verify(result1!.token, secret) as any;
    const decoded2 = jwt.verify(result2!.token, secret) as any;

    expect(decoded1.username).toBe('admin1');
    expect(decoded1.email).toBe('admin1@test.com');
    expect(decoded2.username).toBe('admin2');
    expect(decoded2.email).toBe('admin2@test.com');
  });

  it('should handle case-sensitive username', async () => {
    // Create admin with lowercase username
    const passwordHash = await Bun.password.hash(testAdminData.password);
    await db.insert(adminUsersTable)
      .values({
        username: 'testadmin',
        email: testAdminData.email,
        password_hash: passwordHash
      })
      .execute();

    // Try to login with uppercase username
    const upperCaseInput: AdminLoginInput = {
      username: 'TESTADMIN',
      password: testAdminData.password
    };

    const result = await adminLogin(upperCaseInput);

    // Should return null because username is case-sensitive
    expect(result).toBeNull();
  });

  it('should generate tokens with 24 hour expiration', async () => {
    // Create test admin user
    const passwordHash = await Bun.password.hash(testAdminData.password);
    await db.insert(adminUsersTable)
      .values({
        username: testAdminData.username,
        email: testAdminData.email,
        password_hash: passwordHash
      })
      .execute();

    const result = await adminLogin(testInput);

    expect(result).not.toBeNull();

    // Verify token expiration is approximately 24 hours from now
    const secret = process.env['JWT_SECRET'] || 'default-secret-key';
    const decoded = jwt.verify(result!.token, secret) as any;
    
    const now = Math.floor(Date.now() / 1000);
    const expectedExp = now + (24 * 60 * 60); // 24 hours in seconds
    
    // Allow for small variance in timing (within 1 minute)
    expect(decoded.exp).toBeGreaterThan(now + (23 * 60 * 60)); // At least 23 hours
    expect(decoded.exp).toBeLessThan(now + (25 * 60 * 60)); // Less than 25 hours
  });
});