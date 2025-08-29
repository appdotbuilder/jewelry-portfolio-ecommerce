import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, orderItemsTable, jewelryItemsTable } from '../db/schema';
import { type OrderStatus } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update order status successfully', async () => {
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

    const jewelryItem = jewelryResult[0];

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        session_id: 'test-session-123',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '+1234567890',
        shipping_address: '123 Main St, City, State 12345',
        billing_address: '123 Main St, City, State 12345',
        total_amount: '299.99',
        status: 'pending',
        notes: 'Test order'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order items
    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        jewelry_item_id: jewelryItem.id,
        quantity: 1,
        price_at_time: '299.99'
      })
      .execute();

    // Update order status
    const result = await updateOrderStatus(order.id, 'processing');

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(order.id);
    expect(result!.status).toBe('processing');
    expect(result!.session_id).toBe('test-session-123');
    expect(result!.customer_name).toBe('John Doe');
    expect(result!.customer_email).toBe('john@example.com');
    expect(result!.customer_phone).toBe('+1234567890');
    expect(result!.shipping_address).toBe('123 Main St, City, State 12345');
    expect(result!.billing_address).toBe('123 Main St, City, State 12345');
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.total_amount).toBe(299.99);
    expect(result!.notes).toBe('Test order');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify items are included and properly structured
    expect(result!.items).toHaveLength(1);
    const item = result!.items[0];
    expect(item.id).toBeDefined();
    expect(item.quantity).toBe(1);
    expect(typeof item.price_at_time).toBe('number');
    expect(item.price_at_time).toBe(299.99);
    
    // Verify jewelry item details
    expect(item.jewelry_item.id).toBe(jewelryItem.id);
    expect(item.jewelry_item.name).toBe('Test Ring');
    expect(item.jewelry_item.description).toBe('A beautiful test ring');
    expect(item.jewelry_item.materials).toBe('Gold, Diamond');
    expect(item.jewelry_item.category).toBe('rings');
    expect(typeof item.jewelry_item.price).toBe('number');
    expect(item.jewelry_item.price).toBe(299.99);
    expect(item.jewelry_item.stock_quantity).toBe(10);
    expect(item.jewelry_item.is_featured).toBe(false);
    expect(item.jewelry_item.created_at).toBeInstanceOf(Date);
    expect(item.jewelry_item.updated_at).toBeInstanceOf(Date);
  });

  it('should update order status in database', async () => {
    // Create a jewelry item first
    const jewelryResult = await db.insert(jewelryItemsTable)
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

    const jewelryItem = jewelryResult[0];

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        session_id: 'test-session-456',
        customer_name: 'Jane Smith',
        customer_email: 'jane@example.com',
        shipping_address: '456 Oak Ave, Town, State 67890',
        total_amount: '149.99',
        status: 'pending'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order items
    await db.insert(orderItemsTable)
      .values({
        order_id: order.id,
        jewelry_item_id: jewelryItem.id,
        quantity: 1,
        price_at_time: '149.99'
      })
      .execute();

    // Update status to shipped
    await updateOrderStatus(order.id, 'shipped');

    // Verify in database
    const updatedOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(updatedOrder).toHaveLength(1);
    expect(updatedOrder[0].status).toBe('shipped');
    expect(updatedOrder[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent order', async () => {
    const result = await updateOrderStatus(99999, 'processing');
    expect(result).toBeNull();
  });

  it('should handle all valid order statuses', async () => {
    const validStatuses: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    // Create a jewelry item first
    const jewelryResult = await db.insert(jewelryItemsTable)
      .values({
        name: 'Test Necklace',
        description: 'A beautiful test necklace',
        materials: 'Gold, Ruby',
        category: 'necklaces',
        price: '599.99',
        stock_quantity: 3,
        is_featured: false
      })
      .returning()
      .execute();

    const jewelryItem = jewelryResult[0];

    // Test each status
    for (const status of validStatuses) {
      // Create a new order for each status test
      const orderResult = await db.insert(ordersTable)
        .values({
          session_id: `test-session-${status}`,
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          shipping_address: '123 Test St, Test City, TS 12345',
          total_amount: '599.99',
          status: 'pending'
        })
        .returning()
        .execute();

      const order = orderResult[0];

      // Create order items
      await db.insert(orderItemsTable)
        .values({
          order_id: order.id,
          jewelry_item_id: jewelryItem.id,
          quantity: 1,
          price_at_time: '599.99'
        })
        .execute();

      // Update to target status
      const result = await updateOrderStatus(order.id, status);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(status);
      expect(result!.items).toHaveLength(1);
      expect(typeof result!.total_amount).toBe('number');
      expect(typeof result!.items[0].price_at_time).toBe('number');
      expect(typeof result!.items[0].jewelry_item.price).toBe('number');
    }
  });

  it('should handle orders with multiple items', async () => {
    // Create multiple jewelry items
    const jewelryItems = await db.insert(jewelryItemsTable)
      .values([
        {
          name: 'Diamond Ring',
          description: 'Elegant diamond ring',
          materials: 'Platinum, Diamond',
          category: 'rings',
          price: '1299.99',
          stock_quantity: 2,
          is_featured: true
        },
        {
          name: 'Gold Cufflinks',
          description: 'Classic gold cufflinks',
          materials: 'Gold',
          category: 'cufflinks',
          price: '399.99',
          stock_quantity: 8,
          is_featured: false
        }
      ])
      .returning()
      .execute();

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        session_id: 'test-session-multi',
        customer_name: 'Multi Item Customer',
        customer_email: 'multi@example.com',
        shipping_address: '789 Multi St, Multi City, MC 54321',
        total_amount: '2099.97', // (1299.99 * 1) + (399.99 * 2)
        status: 'pending'
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create multiple order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: order.id,
          jewelry_item_id: jewelryItems[0].id,
          quantity: 1,
          price_at_time: '1299.99'
        },
        {
          order_id: order.id,
          jewelry_item_id: jewelryItems[1].id,
          quantity: 2,
          price_at_time: '399.99'
        }
      ])
      .execute();

    // Update order status
    const result = await updateOrderStatus(order.id, 'processing');

    expect(result).not.toBeNull();
    expect(result!.status).toBe('processing');
    expect(result!.items).toHaveLength(2);

    // Verify first item
    const firstItem = result!.items.find(item => item.jewelry_item.name === 'Diamond Ring');
    expect(firstItem).toBeDefined();
    expect(firstItem!.quantity).toBe(1);
    expect(firstItem!.price_at_time).toBe(1299.99);
    expect(firstItem!.jewelry_item.category).toBe('rings');

    // Verify second item
    const secondItem = result!.items.find(item => item.jewelry_item.name === 'Gold Cufflinks');
    expect(secondItem).toBeDefined();
    expect(secondItem!.quantity).toBe(2);
    expect(secondItem!.price_at_time).toBe(399.99);
    expect(secondItem!.jewelry_item.category).toBe('cufflinks');

    // Verify all numeric conversions
    expect(typeof result!.total_amount).toBe('number');
    result!.items.forEach(item => {
      expect(typeof item.price_at_time).toBe('number');
      expect(typeof item.jewelry_item.price).toBe('number');
    });
  });
});