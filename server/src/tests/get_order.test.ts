import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, orderItemsTable, jewelryItemsTable } from '../db/schema';
import { getOrder } from '../handlers/get_order';

describe('getOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent order', async () => {
    const result = await getOrder(999);
    expect(result).toBeNull();
  });

  it('should get an order with items and jewelry details', async () => {
    // Create test jewelry item
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values({
        name: 'Test Ring',
        description: 'A beautiful test ring',
        materials: 'gold, diamond',
        category: 'rings',
        price: '299.99',
        stock_quantity: 5,
        is_featured: true
      })
      .returning()
      .execute();

    const jewelryItem = jewelryResult[0];

    // Create test order
    const orderResult = await db.insert(ordersTable)
      .values({
        session_id: 'test-session-123',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '+1234567890',
        shipping_address: '123 Main St, City, State 12345',
        billing_address: '456 Oak Ave, City, State 12345',
        total_amount: '599.98',
        status: 'pending',
        notes: 'Test order notes'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order.id,
          jewelry_item_id: jewelryItem.id,
          quantity: 2,
          price_at_time: '299.99'
        }
      ])
      .execute();

    // Test the handler
    const result = await getOrder(order.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(order.id);
    expect(result!.session_id).toBe('test-session-123');
    expect(result!.customer_name).toBe('John Doe');
    expect(result!.customer_email).toBe('john@example.com');
    expect(result!.customer_phone).toBe('+1234567890');
    expect(result!.shipping_address).toBe('123 Main St, City, State 12345');
    expect(result!.billing_address).toBe('456 Oak Ave, City, State 12345');
    expect(result!.total_amount).toBe(599.98);
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.status).toBe('pending');
    expect(result!.notes).toBe('Test order notes');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Check order items
    expect(result!.items).toHaveLength(1);
    const item = result!.items[0];
    expect(item.quantity).toBe(2);
    expect(item.price_at_time).toBe(299.99);
    expect(typeof item.price_at_time).toBe('number');

    // Check jewelry item details
    expect(item.jewelry_item.name).toBe('Test Ring');
    expect(item.jewelry_item.description).toBe('A beautiful test ring');
    expect(item.jewelry_item.materials).toBe('gold, diamond');
    expect(item.jewelry_item.category).toBe('rings');
    expect(item.jewelry_item.price).toBe(299.99);
    expect(typeof item.jewelry_item.price).toBe('number');
    expect(item.jewelry_item.stock_quantity).toBe(5);
    expect(item.jewelry_item.is_featured).toBe(true);
  });

  it('should get an order with multiple items', async () => {
    // Create test jewelry items
    const jewelryResults = await db.insert(jewelryItemsTable)
      .values([
        {
          name: 'Gold Ring',
          description: 'Elegant gold ring',
          materials: 'gold',
          category: 'rings',
          price: '199.99',
          stock_quantity: 3,
          is_featured: false
        },
        {
          name: 'Diamond Necklace',
          description: 'Sparkling diamond necklace',
          materials: 'gold, diamond',
          category: 'necklaces',
          price: '899.99',
          stock_quantity: 1,
          is_featured: true
        }
      ])
      .returning()
      .execute();

    const [ring, necklace] = jewelryResults;

    // Create test order
    const orderResult = await db.insert(ordersTable)
      .values({
        session_id: 'test-session-456',
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
        customer_phone: null,
        shipping_address: '789 Pine St, City, State 12345',
        billing_address: null,
        total_amount: '1299.97',
        status: 'processing'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create multiple order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order.id,
          jewelry_item_id: ring.id,
          quantity: 2,
          price_at_time: '199.99'
        },
        {
          order_id: order.id,
          jewelry_item_id: necklace.id,
          quantity: 1,
          price_at_time: '899.99'
        }
      ])
      .execute();

    // Test the handler
    const result = await getOrder(order.id);

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(2);

    // Check first item (ring)
    const ringItem = result!.items.find(item => item.jewelry_item.name === 'Gold Ring');
    expect(ringItem).toBeDefined();
    expect(ringItem!.quantity).toBe(2);
    expect(ringItem!.price_at_time).toBe(199.99);
    expect(ringItem!.jewelry_item.category).toBe('rings');

    // Check second item (necklace)
    const necklaceItem = result!.items.find(item => item.jewelry_item.name === 'Diamond Necklace');
    expect(necklaceItem).toBeDefined();
    expect(necklaceItem!.quantity).toBe(1);
    expect(necklaceItem!.price_at_time).toBe(899.99);
    expect(necklaceItem!.jewelry_item.category).toBe('necklaces');

    // Verify numeric conversions
    expect(typeof result!.total_amount).toBe('number');
    expect(typeof ringItem!.price_at_time).toBe('number');
    expect(typeof necklaceItem!.price_at_time).toBe('number');
    expect(typeof ringItem!.jewelry_item.price).toBe('number');
    expect(typeof necklaceItem!.jewelry_item.price).toBe('number');
  });

  it('should return order with empty items array when order has no items', async () => {
    // Create test order without items
    const orderResult = await db.insert(ordersTable)
      .values({
        session_id: 'test-session-empty',
        customer_name: 'Empty Order',
        customer_email: 'empty@example.com',
        shipping_address: '123 Empty St, City, State 12345',
        total_amount: '0.00',
        status: 'cancelled'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Test the handler
    const result = await getOrder(order.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(order.id);
    expect(result!.customer_name).toBe('Empty Order');
    expect(result!.items).toHaveLength(0);
    expect(result!.total_amount).toBe(0);
    expect(typeof result!.total_amount).toBe('number');
  });

  it('should handle nullable fields correctly', async () => {
    // Create test jewelry item
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values({
        name: 'Simple Earrings',
        description: 'Basic earrings',
        materials: 'silver',
        category: 'earrings',
        price: '49.99',
        stock_quantity: 10,
        image_url: null // Test nullable field
      })
      .returning()
      .execute();

    const jewelryItem = jewelryResult[0];

    // Create order with nullable fields
    const orderResult = await db.insert(ordersTable)
      .values({
        session_id: 'test-session-nullable',
        customer_name: 'Nullable Test',
        customer_email: 'nullable@example.com',
        customer_phone: null, // Nullable
        shipping_address: '456 Null St, City, State 12345',
        billing_address: null, // Nullable
        total_amount: '49.99',
        status: 'shipped',
        notes: null // Nullable
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order item
    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        jewelry_item_id: jewelryItem.id,
        quantity: 1,
        price_at_time: '49.99'
      })
      .execute();

    // Test the handler
    const result = await getOrder(order.id);

    expect(result).not.toBeNull();
    expect(result!.customer_phone).toBeNull();
    expect(result!.billing_address).toBeNull();
    expect(result!.notes).toBeNull();
    expect(result!.items[0].jewelry_item.image_url).toBeNull();
  });
});