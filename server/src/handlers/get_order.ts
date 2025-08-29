import { db } from '../db';
import { ordersTable, orderItemsTable, jewelryItemsTable } from '../db/schema';
import { type OrderWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function getOrder(id: number): Promise<OrderWithItems | null> {
  try {
    // First, get the order
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .execute();

    if (orders.length === 0) {
      return null;
    }

    const order = orders[0];

    // Get order items with jewelry item details
    const orderItemsWithJewelry = await db.select()
      .from(orderItemsTable)
      .innerJoin(jewelryItemsTable, eq(orderItemsTable.jewelry_item_id, jewelryItemsTable.id))
      .where(eq(orderItemsTable.order_id, id))
      .execute();

    // Transform the order items data
    const items = orderItemsWithJewelry.map(result => ({
      id: result.order_items.id,
      quantity: result.order_items.quantity,
      price_at_time: parseFloat(result.order_items.price_at_time), // Convert numeric to number
      jewelry_item: {
        ...result.jewelry_items,
        price: parseFloat(result.jewelry_items.price) // Convert numeric to number
      }
    }));

    // Return the complete order with items
    return {
      ...order,
      total_amount: parseFloat(order.total_amount), // Convert numeric to number
      items
    };
  } catch (error) {
    console.error('Get order failed:', error);
    throw error;
  }
}