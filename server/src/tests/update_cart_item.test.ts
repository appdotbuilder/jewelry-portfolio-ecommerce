import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, jewelryItemsTable } from '../db/schema';
import { type UpdateCartItemInput } from '../schema';
import { updateCartItem } from '../handlers/update_cart_item';
import { eq } from 'drizzle-orm';

describe('updateCartItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testJewelryId: number;
  let testCartItemId: number;
  const testSessionId = 'test-session-123';

  beforeEach(async () => {
    // Create a jewelry item first
    const jewelryResult = await db.insert(jewelryItemsTable)
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
    
    testJewelryId = jewelryResult[0].id;

    // Create a cart item
    const cartResult = await db.insert(cartItemsTable)
      .values({
        session_id: testSessionId,
        jewelry_item_id: testJewelryId,
        quantity: 2
      })
      .returning()
      .execute();
    
    testCartItemId = cartResult[0].id;
  });

  it('should update cart item quantity successfully', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 5
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testCartItemId);
    expect(result!.quantity).toEqual(5);
    expect(result!.session_id).toEqual(testSessionId);
    expect(result!.jewelry_item.id).toEqual(testJewelryId);
    expect(result!.jewelry_item.name).toEqual('Test Ring');
    expect(result!.jewelry_item.price).toEqual(299.99);
    expect(typeof result!.jewelry_item.price).toEqual('number');
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should verify cart item is updated in database', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 3
    };

    await updateCartItem(input);

    // Verify in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItemId))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(3);
    expect(cartItems[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent cart item', async () => {
    const input: UpdateCartItemInput = {
      id: 99999, // Non-existent ID
      quantity: 1
    };

    const result = await updateCartItem(input);

    expect(result).toBeNull();
  });

  it('should include all jewelry item fields in response', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 1
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.jewelry_item).toEqual({
      id: testJewelryId,
      name: 'Test Ring',
      description: 'A beautiful test ring',
      materials: 'Gold, Diamond',
      category: 'rings',
      price: 299.99,
      image_url: null,
      stock_quantity: 10,
      is_featured: false,
      created_at: expect.any(Date),
      updated_at: expect.any(Date)
    });
  });

  it('should handle quantity update to 1', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 1
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.quantity).toEqual(1);

    // Verify persistence
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItemId))
      .execute();

    expect(cartItems[0].quantity).toEqual(1);
  });

  it('should handle large quantity values', async () => {
    const input: UpdateCartItemInput = {
      id: testCartItemId,
      quantity: 100
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.quantity).toEqual(100);
  });

  it('should return cart item with correct session context', async () => {
    // Create another cart item with different session
    const otherSessionId = 'other-session-456';
    const otherCartResult = await db.insert(cartItemsTable)
      .values({
        session_id: otherSessionId,
        jewelry_item_id: testJewelryId,
        quantity: 1
      })
      .returning()
      .execute();

    const input: UpdateCartItemInput = {
      id: otherCartResult[0].id,
      quantity: 7
    };

    const result = await updateCartItem(input);

    expect(result).not.toBeNull();
    expect(result!.session_id).toEqual(otherSessionId);
    expect(result!.quantity).toEqual(7);
    
    // Original cart item should remain unchanged
    const originalCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItemId))
      .execute();
    
    expect(originalCartItems[0].quantity).toEqual(2); // Original quantity
    expect(originalCartItems[0].session_id).toEqual(testSessionId);
  });
});