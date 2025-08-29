import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, orderItemsTable, jewelryItemsTable } from '../db/schema';
import { getOrders } from '../handlers/get_orders';
import { type CreateOrderInput, type CreateJewelryItemInput } from '../schema';

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testJewelryItem: CreateJewelryItemInput = {
    name: 'Diamond Ring',
    description: 'Beautiful diamond ring',
    materials: 'Gold, Diamond',
    category: 'rings',
    price: 1299.99,
    image_url: 'https://example.com/ring.jpg',
    stock_quantity: 10,
    is_featured: true
  };

  const testOrder = {
    session_id: 'session123',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    customer_phone: '+1234567890',
    shipping_address: '123 Main St, City, State 12345',
    billing_address: '123 Main St, City, State 12345',
    total_amount: '1299.99',
    status: 'pending' as const,
    notes: 'Rush order'
  };

  it('should return empty array when no orders exist', async () => {
    const result = await getOrders();
    expect(result).toEqual([]);
  });

  it('should return orders with correct structure', async () => {
    // Create jewelry item first
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem,
        price: testJewelryItem.price.toString()
      })
      .returning()
      .execute();
    const jewelryItem = jewelryResult[0];

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values(testOrder)
      .returning()
      .execute();
    const order = orderResult[0];

    // Create order item
    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        jewelry_item_id: jewelryItem.id,
        quantity: 2,
        price_at_time: '1299.99'
      })
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(1);
    
    const returnedOrder = result[0];
    expect(returnedOrder.id).toEqual(order.id);
    expect(returnedOrder.session_id).toEqual('session123');
    expect(returnedOrder.customer_name).toEqual('John Doe');
    expect(returnedOrder.customer_email).toEqual('john@example.com');
    expect(returnedOrder.customer_phone).toEqual('+1234567890');
    expect(returnedOrder.shipping_address).toEqual('123 Main St, City, State 12345');
    expect(returnedOrder.billing_address).toEqual('123 Main St, City, State 12345');
    expect(typeof returnedOrder.total_amount).toBe('number');
    expect(returnedOrder.total_amount).toEqual(1299.99);
    expect(returnedOrder.status).toEqual('pending');
    expect(returnedOrder.notes).toEqual('Rush order');
    expect(returnedOrder.created_at).toBeInstanceOf(Date);
    expect(returnedOrder.updated_at).toBeInstanceOf(Date);
    expect(returnedOrder.items).toHaveLength(1);

    const orderItem = returnedOrder.items[0];
    expect(orderItem.quantity).toEqual(2);
    expect(typeof orderItem.price_at_time).toBe('number');
    expect(orderItem.price_at_time).toEqual(1299.99);
    expect(orderItem.jewelry_item.id).toEqual(jewelryItem.id);
    expect(orderItem.jewelry_item.name).toEqual('Diamond Ring');
    expect(typeof orderItem.jewelry_item.price).toBe('number');
    expect(orderItem.jewelry_item.price).toEqual(1299.99);
  });

  it('should return multiple orders sorted by creation date (newest first)', async () => {
    // Create jewelry item
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem,
        price: testJewelryItem.price.toString()
      })
      .returning()
      .execute();
    const jewelryItem = jewelryResult[0];

    // Create first order
    const firstOrderResult = await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_name: 'First Customer'
      })
      .returning()
      .execute();
    const firstOrder = firstOrderResult[0];

    // Create second order (created later)
    const secondOrderResult = await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_name: 'Second Customer',
        session_id: 'session456'
      })
      .returning()
      .execute();
    const secondOrder = secondOrderResult[0];

    // Add items to both orders
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: firstOrder.id,
          jewelry_item_id: jewelryItem.id,
          quantity: 1,
          price_at_time: '1299.99'
        },
        {
          order_id: secondOrder.id,
          jewelry_item_id: jewelryItem.id,
          quantity: 3,
          price_at_time: '1299.99'
        }
      ])
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(2);
    
    // Should be sorted by creation date (newest first)
    expect(result[0].customer_name).toEqual('Second Customer');
    expect(result[1].customer_name).toEqual('First Customer');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle orders with multiple items', async () => {
    // Create two jewelry items
    const firstJewelryResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem,
        name: 'Diamond Ring',
        price: testJewelryItem.price.toString()
      })
      .returning()
      .execute();
    const firstJewelryItem = firstJewelryResult[0];

    const secondJewelryResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem,
        name: 'Gold Earrings',
        category: 'earrings',
        price: '599.99'
      })
      .returning()
      .execute();
    const secondJewelryItem = secondJewelryResult[0];

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values(testOrder)
      .returning()
      .execute();
    const order = orderResult[0];

    // Create multiple order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order.id,
          jewelry_item_id: firstJewelryItem.id,
          quantity: 1,
          price_at_time: '1299.99'
        },
        {
          order_id: order.id,
          jewelry_item_id: secondJewelryItem.id,
          quantity: 2,
          price_at_time: '599.99'
        }
      ])
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
    
    // Verify both items are included
    const itemNames = result[0].items.map(item => item.jewelry_item.name);
    expect(itemNames).toContain('Diamond Ring');
    expect(itemNames).toContain('Gold Earrings');
  });

  it('should handle orders with no items', async () => {
    // Create order without any order items
    await db.insert(ordersTable)
      .values(testOrder)
      .returning()
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(0);
    expect(result[0].customer_name).toEqual('John Doe');
  });

  it('should handle nullable fields correctly', async () => {
    // Create jewelry item
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem,
        image_url: null, // Test nullable field
        price: testJewelryItem.price.toString()
      })
      .returning()
      .execute();
    const jewelryItem = jewelryResult[0];

    // Create order with nullable fields
    const orderResult = await db.insert(ordersTable)
      .values({
        ...testOrder,
        customer_phone: null,
        billing_address: null,
        notes: null
      })
      .returning()
      .execute();
    const order = orderResult[0];

    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        jewelry_item_id: jewelryItem.id,
        quantity: 1,
        price_at_time: '1299.99'
      })
      .execute();

    const result = await getOrders();

    expect(result).toHaveLength(1);
    expect(result[0].customer_phone).toBeNull();
    expect(result[0].billing_address).toBeNull();
    expect(result[0].notes).toBeNull();
    expect(result[0].items[0].jewelry_item.image_url).toBeNull();
  });

  it('should handle different order statuses', async () => {
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
    
    for (const status of statuses) {
      await db.insert(ordersTable)
        .values({
          ...testOrder,
          status,
          session_id: `session_${status}`
        })
        .execute();
    }

    const result = await getOrders();

    expect(result).toHaveLength(5);
    
    const returnedStatuses = result.map(order => order.status);
    for (const status of statuses) {
      expect(returnedStatuses).toContain(status);
    }
  });
});