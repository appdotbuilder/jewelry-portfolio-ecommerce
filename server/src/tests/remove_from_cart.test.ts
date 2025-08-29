import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, jewelryItemsTable } from '../db/schema';
import { removeFromCart } from '../handlers/remove_from_cart';
import { eq } from 'drizzle-orm';

describe('removeFromCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should remove an existing cart item', async () => {
    // First create a jewelry item
    const jewelryItem = await db.insert(jewelryItemsTable)
      .values({
        name: 'Test Ring',
        description: 'A beautiful test ring',
        materials: 'Gold, Diamond',
        category: 'rings',
        price: '299.99',
        stock_quantity: 10,
        is_featured: false
      })
      .returning()
      .execute();

    // Create a cart item
    const cartItem = await db.insert(cartItemsTable)
      .values({
        session_id: 'test-session-123',
        jewelry_item_id: jewelryItem[0].id,
        quantity: 2
      })
      .returning()
      .execute();

    // Remove the cart item
    const result = await removeFromCart(cartItem[0].id);

    // Should return true indicating successful removal
    expect(result).toBe(true);

    // Verify the item is no longer in the database
    const remainingItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItem[0].id))
      .execute();

    expect(remainingItems).toHaveLength(0);
  });

  it('should return false when trying to remove non-existent cart item', async () => {
    // Try to remove a cart item that doesn't exist
    const result = await removeFromCart(99999);

    // Should return false indicating no item was found
    expect(result).toBe(false);
  });

  it('should not affect other cart items', async () => {
    // First create a jewelry item
    const jewelryItem = await db.insert(jewelryItemsTable)
      .values({
        name: 'Test Earrings',
        description: 'Beautiful test earrings',
        materials: 'Silver, Pearl',
        category: 'earrings',
        price: '149.99',
        stock_quantity: 5,
        is_featured: true
      })
      .returning()
      .execute();

    // Create two cart items for the same session
    const cartItems = await db.insert(cartItemsTable)
      .values([
        {
          session_id: 'test-session-456',
          jewelry_item_id: jewelryItem[0].id,
          quantity: 1
        },
        {
          session_id: 'test-session-456',
          jewelry_item_id: jewelryItem[0].id,
          quantity: 3
        }
      ])
      .returning()
      .execute();

    // Remove only the first cart item
    const result = await removeFromCart(cartItems[0].id);

    // Should return true
    expect(result).toBe(true);

    // Verify only the first item was removed
    const remainingItems = await db.select()
      .from(cartItemsTable)
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].id).toBe(cartItems[1].id);
    expect(remainingItems[0].quantity).toBe(3);
  });

  it('should handle removing cart items from different sessions', async () => {
    // Create a jewelry item
    const jewelryItem = await db.insert(jewelryItemsTable)
      .values({
        name: 'Test Necklace',
        description: 'Elegant test necklace',
        materials: 'Platinum, Ruby',
        category: 'necklaces',
        price: '899.99',
        stock_quantity: 3,
        is_featured: false
      })
      .returning()
      .execute();

    // Create cart items for different sessions
    const cartItems = await db.insert(cartItemsTable)
      .values([
        {
          session_id: 'session-a',
          jewelry_item_id: jewelryItem[0].id,
          quantity: 1
        },
        {
          session_id: 'session-b',
          jewelry_item_id: jewelryItem[0].id,
          quantity: 2
        }
      ])
      .returning()
      .execute();

    // Remove item from session-a
    const result = await removeFromCart(cartItems[0].id);

    expect(result).toBe(true);

    // Verify session-b item remains
    const remainingItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, 'session-b'))
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].quantity).toBe(2);
  });
});