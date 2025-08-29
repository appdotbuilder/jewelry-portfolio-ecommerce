import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, jewelryItemsTable } from '../db/schema';
import { type AddToCartInput } from '../schema';
import { addToCart } from '../handlers/add_to_cart';
import { eq, and } from 'drizzle-orm';

// Test jewelry item data
const testJewelryItem = {
  name: 'Diamond Ring',
  description: 'Beautiful diamond engagement ring',
  materials: 'Gold, Diamond',
  category: 'rings' as const,
  price: '1299.99',
  image_url: 'https://example.com/ring.jpg',
  stock_quantity: 5,
  is_featured: true
};

// Test input for adding to cart
const testInput: AddToCartInput = {
  session_id: 'session_123',
  jewelry_item_id: 1, // Will be set after creating jewelry item
  quantity: 2
};

describe('addToCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should add a new item to cart', async () => {
    // Create a jewelry item first
    const jewelryItems = await db.insert(jewelryItemsTable)
      .values(testJewelryItem)
      .returning()
      .execute();

    const jewelryItem = jewelryItems[0];
    const input = { ...testInput, jewelry_item_id: jewelryItem.id };

    const result = await addToCart(input);

    // Verify the returned cart item
    expect(result.session_id).toEqual('session_123');
    expect(result.quantity).toEqual(2);
    expect(result.jewelry_item.id).toEqual(jewelryItem.id);
    expect(result.jewelry_item.name).toEqual('Diamond Ring');
    expect(result.jewelry_item.price).toEqual(1299.99); // Should be converted to number
    expect(typeof result.jewelry_item.price).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save cart item to database', async () => {
    // Create a jewelry item first
    const jewelryItems = await db.insert(jewelryItemsTable)
      .values(testJewelryItem)
      .returning()
      .execute();

    const jewelryItem = jewelryItems[0];
    const input = { ...testInput, jewelry_item_id: jewelryItem.id };

    const result = await addToCart(input);

    // Query database to verify cart item was saved
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, result.id))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].session_id).toEqual('session_123');
    expect(cartItems[0].jewelry_item_id).toEqual(jewelryItem.id);
    expect(cartItems[0].quantity).toEqual(2);
    expect(cartItems[0].created_at).toBeInstanceOf(Date);
  });

  it('should update quantity when item already exists in cart', async () => {
    // Create a jewelry item first
    const jewelryItems = await db.insert(jewelryItemsTable)
      .values(testJewelryItem)
      .returning()
      .execute();

    const jewelryItem = jewelryItems[0];

    // Add item to cart first time
    const firstInput = { ...testInput, jewelry_item_id: jewelryItem.id, quantity: 1 };
    await addToCart(firstInput);

    // Add same item again
    const secondInput = { ...testInput, jewelry_item_id: jewelryItem.id, quantity: 2 };
    const result = await addToCart(secondInput);

    // Should have updated quantity (1 + 2 = 3)
    expect(result.quantity).toEqual(3);

    // Verify only one cart item exists in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.session_id, 'session_123'),
        eq(cartItemsTable.jewelry_item_id, jewelryItem.id)
      ))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(3);
  });

  it('should throw error when jewelry item does not exist', async () => {
    const input = { ...testInput, jewelry_item_id: 999 };

    await expect(addToCart(input)).rejects.toThrow(/jewelry item.*not found/i);
  });

  it('should throw error when insufficient stock for new cart item', async () => {
    // Create jewelry item with limited stock
    const limitedStockItem = {
      ...testJewelryItem,
      stock_quantity: 1
    };

    const jewelryItems = await db.insert(jewelryItemsTable)
      .values(limitedStockItem)
      .returning()
      .execute();

    const jewelryItem = jewelryItems[0];
    const input = { ...testInput, jewelry_item_id: jewelryItem.id, quantity: 2 }; // Requesting more than available

    await expect(addToCart(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error when total quantity exceeds stock for existing cart item', async () => {
    // Create jewelry item with limited stock
    const limitedStockItem = {
      ...testJewelryItem,
      stock_quantity: 3
    };

    const jewelryItems = await db.insert(jewelryItemsTable)
      .values(limitedStockItem)
      .returning()
      .execute();

    const jewelryItem = jewelryItems[0];

    // Add 2 items to cart first
    const firstInput = { ...testInput, jewelry_item_id: jewelryItem.id, quantity: 2 };
    await addToCart(firstInput);

    // Try to add 2 more (total would be 4, but stock is only 3)
    const secondInput = { ...testInput, jewelry_item_id: jewelryItem.id, quantity: 2 };

    await expect(addToCart(secondInput)).rejects.toThrow(/insufficient stock.*total requested/i);
  });

  it('should handle different sessions separately', async () => {
    // Create a jewelry item first
    const jewelryItems = await db.insert(jewelryItemsTable)
      .values(testJewelryItem)
      .returning()
      .execute();

    const jewelryItem = jewelryItems[0];

    // Add item to first session
    const session1Input = { ...testInput, session_id: 'session_1', jewelry_item_id: jewelryItem.id, quantity: 1 };
    const result1 = await addToCart(session1Input);

    // Add same item to different session
    const session2Input = { ...testInput, session_id: 'session_2', jewelry_item_id: jewelryItem.id, quantity: 2 };
    const result2 = await addToCart(session2Input);

    // Should create separate cart items
    expect(result1.session_id).toEqual('session_1');
    expect(result1.quantity).toEqual(1);
    expect(result2.session_id).toEqual('session_2');
    expect(result2.quantity).toEqual(2);

    // Verify both items exist in database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.jewelry_item_id, jewelryItem.id))
      .execute();

    expect(cartItems).toHaveLength(2);
  });

  it('should handle single item quantity correctly', async () => {
    // Create a jewelry item first
    const jewelryItems = await db.insert(jewelryItemsTable)
      .values(testJewelryItem)
      .returning()
      .execute();

    const jewelryItem = jewelryItems[0];
    const input = { ...testInput, jewelry_item_id: jewelryItem.id, quantity: 1 };

    const result = await addToCart(input);

    expect(result.quantity).toEqual(1);
    expect(result.jewelry_item.stock_quantity).toEqual(5);
  });
});