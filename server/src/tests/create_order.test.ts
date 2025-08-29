import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelryItemsTable, cartItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

// Test data
const testJewelryItem = {
  name: 'Diamond Ring',
  description: 'Beautiful diamond engagement ring',
  materials: 'Gold, Diamond',
  category: 'rings' as const,
  price: '1999.99',
  image_url: 'https://example.com/ring.jpg',
  stock_quantity: 5,
  is_featured: true
};

const testJewelryItem2 = {
  name: 'Pearl Earrings',
  description: 'Elegant pearl earrings',
  materials: 'Silver, Pearl',
  category: 'earrings' as const,
  price: '299.99',
  image_url: 'https://example.com/earrings.jpg',
  stock_quantity: 10,
  is_featured: false
};

const testOrderInput: CreateOrderInput = {
  session_id: 'test-session-123',
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  customer_phone: '+1-555-0123',
  shipping_address: '123 Main St, City, State 12345',
  billing_address: '123 Main St, City, State 12345',
  notes: 'Please handle with care'
};

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an order from cart items', async () => {
    // Create jewelry items
    const jewelryResults = await db.insert(jewelryItemsTable)
      .values([testJewelryItem, testJewelryItem2])
      .returning()
      .execute();

    const jewelry1 = jewelryResults[0];
    const jewelry2 = jewelryResults[1];

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: testOrderInput.session_id,
          jewelry_item_id: jewelry1.id,
          quantity: 2
        },
        {
          session_id: testOrderInput.session_id,
          jewelry_item_id: jewelry2.id,
          quantity: 1
        }
      ])
      .execute();

    // Create order
    const result = await createOrder(testOrderInput);

    // Verify order was created
    expect(result).not.toBeNull();
    expect(result!.customer_name).toBe('John Doe');
    expect(result!.customer_email).toBe('john@example.com');
    expect(result!.customer_phone).toBe('+1-555-0123');
    expect(result!.shipping_address).toBe('123 Main St, City, State 12345');
    expect(result!.billing_address).toBe('123 Main St, City, State 12345');
    expect(result!.notes).toBe('Please handle with care');
    expect(result!.status).toBe('pending');
    expect(result!.session_id).toBe('test-session-123');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify total amount calculation
    const expectedTotal = (1999.99 * 2) + (299.99 * 1);
    expect(result!.total_amount).toBe(expectedTotal);
    expect(typeof result!.total_amount).toBe('number');

    // Verify order items
    expect(result!.items).toHaveLength(2);
    
    const item1 = result!.items.find(item => item.jewelry_item.name === 'Diamond Ring');
    expect(item1).toBeDefined();
    expect(item1!.quantity).toBe(2);
    expect(item1!.price_at_time).toBe(1999.99);
    expect(typeof item1!.price_at_time).toBe('number');
    expect(item1!.jewelry_item.price).toBe(1999.99);
    expect(typeof item1!.jewelry_item.price).toBe('number');
    
    const item2 = result!.items.find(item => item.jewelry_item.name === 'Pearl Earrings');
    expect(item2).toBeDefined();
    expect(item2!.quantity).toBe(1);
    expect(item2!.price_at_time).toBe(299.99);
    expect(typeof item2!.price_at_time).toBe('number');
  });

  it('should save order to database', async () => {
    // Create jewelry item
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values(testJewelryItem)
      .returning()
      .execute();

    const jewelry = jewelryResult[0];

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        session_id: testOrderInput.session_id,
        jewelry_item_id: jewelry.id,
        quantity: 1
      })
      .execute();

    // Create order
    const result = await createOrder(testOrderInput);

    // Verify order exists in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result!.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].customer_name).toBe('John Doe');
    expect(parseFloat(orders[0].total_amount)).toBe(1999.99);

    // Verify order items exist in database
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, result!.id))
      .execute();

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].quantity).toBe(1);
    expect(parseFloat(orderItems[0].price_at_time)).toBe(1999.99);
  });

  it('should update stock quantities', async () => {
    // Create jewelry item
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values(testJewelryItem)
      .returning()
      .execute();

    const jewelry = jewelryResult[0];
    const initialStock = jewelry.stock_quantity;

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        session_id: testOrderInput.session_id,
        jewelry_item_id: jewelry.id,
        quantity: 2
      })
      .execute();

    // Create order
    await createOrder(testOrderInput);

    // Verify stock was updated
    const updatedJewelry = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, jewelry.id))
      .execute();

    expect(updatedJewelry[0].stock_quantity).toBe(initialStock - 2);
  });

  it('should clear cart after order creation', async () => {
    // Create jewelry item
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values(testJewelryItem)
      .returning()
      .execute();

    const jewelry = jewelryResult[0];

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        session_id: testOrderInput.session_id,
        jewelry_item_id: jewelry.id,
        quantity: 1
      })
      .execute();

    // Verify cart has items
    const cartBeforeOrder = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, testOrderInput.session_id))
      .execute();

    expect(cartBeforeOrder).toHaveLength(1);

    // Create order
    await createOrder(testOrderInput);

    // Verify cart is empty
    const cartAfterOrder = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, testOrderInput.session_id))
      .execute();

    expect(cartAfterOrder).toHaveLength(0);
  });

  it('should return null for empty cart', async () => {
    const result = await createOrder(testOrderInput);
    expect(result).toBeNull();
  });

  it('should return null when stock is insufficient', async () => {
    // Create jewelry item with low stock
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem,
        stock_quantity: 1
      })
      .returning()
      .execute();

    const jewelry = jewelryResult[0];

    // Add more items to cart than available in stock
    await db.insert(cartItemsTable)
      .values({
        session_id: testOrderInput.session_id,
        jewelry_item_id: jewelry.id,
        quantity: 5 // More than available stock (1)
      })
      .execute();

    const result = await createOrder(testOrderInput);
    expect(result).toBeNull();

    // Verify no order was created
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.session_id, testOrderInput.session_id))
      .execute();

    expect(orders).toHaveLength(0);

    // Verify cart items still exist
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.session_id, testOrderInput.session_id))
      .execute();

    expect(cartItems).toHaveLength(1);
  });

  it('should handle multiple items with mixed stock availability', async () => {
    // Create jewelry items - one with sufficient stock, one with insufficient
    const jewelryResults = await db.insert(jewelryItemsTable)
      .values([
        { ...testJewelryItem, stock_quantity: 5 },
        { ...testJewelryItem2, stock_quantity: 1 }
      ])
      .returning()
      .execute();

    const jewelry1 = jewelryResults[0];
    const jewelry2 = jewelryResults[1];

    // Add items to cart - second item exceeds stock
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: testOrderInput.session_id,
          jewelry_item_id: jewelry1.id,
          quantity: 2
        },
        {
          session_id: testOrderInput.session_id,
          jewelry_item_id: jewelry2.id,
          quantity: 3 // More than available stock (1)
        }
      ])
      .execute();

    const result = await createOrder(testOrderInput);
    expect(result).toBeNull();
  });

  it('should handle nullable fields correctly', async () => {
    // Create jewelry item
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem,
        image_url: null // Test nullable field
      })
      .returning()
      .execute();

    const jewelry = jewelryResult[0];

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({
        session_id: testOrderInput.session_id,
        jewelry_item_id: jewelry.id,
        quantity: 1
      })
      .execute();

    // Create order with nullable fields
    const orderInputWithNulls: CreateOrderInput = {
      ...testOrderInput,
      customer_phone: null,
      billing_address: null,
      notes: null
    };

    const result = await createOrder(orderInputWithNulls);

    expect(result).not.toBeNull();
    expect(result!.customer_phone).toBeNull();
    expect(result!.billing_address).toBeNull();
    expect(result!.notes).toBeNull();
    expect(result!.items[0].jewelry_item.image_url).toBeNull();
  });
});