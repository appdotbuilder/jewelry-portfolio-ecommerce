import { db } from '../db';
import { ordersTable, orderItemsTable, jewelryItemsTable } from '../db/schema';
import { type OrderWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function getOrders(): Promise<OrderWithItems[]> {
  try {
    // Get all orders with their items and jewelry details
    const results = await db.select()
      .from(ordersTable)
      .leftJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.order_id))
      .leftJoin(jewelryItemsTable, eq(orderItemsTable.jewelry_item_id, jewelryItemsTable.id))
      .execute();

    // Group results by order ID to structure the response
    const ordersMap = new Map<number, OrderWithItems>();

    results.forEach(result => {
      const order = result.orders;
      const orderItem = result.order_items;
      const jewelryItem = result.jewelry_items;

      // Initialize order if not already in map
      if (!ordersMap.has(order.id)) {
        ordersMap.set(order.id, {
          id: order.id,
          session_id: order.session_id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          shipping_address: order.shipping_address,
          billing_address: order.billing_address,
          total_amount: parseFloat(order.total_amount), // Convert numeric to number
          status: order.status,
          notes: order.notes,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: []
        });
      }

      // Add order item if it exists (left join might have null items for orders with no items)
      if (orderItem && jewelryItem) {
        const existingOrder = ordersMap.get(order.id)!;
        existingOrder.items.push({
          id: orderItem.id,
          quantity: orderItem.quantity,
          price_at_time: parseFloat(orderItem.price_at_time), // Convert numeric to number
          jewelry_item: {
            id: jewelryItem.id,
            name: jewelryItem.name,
            description: jewelryItem.description,
            materials: jewelryItem.materials,
            category: jewelryItem.category,
            price: parseFloat(jewelryItem.price), // Convert numeric to number
            image_url: jewelryItem.image_url,
            stock_quantity: jewelryItem.stock_quantity,
            is_featured: jewelryItem.is_featured,
            created_at: jewelryItem.created_at,
            updated_at: jewelryItem.updated_at
          }
        });
      }
    });

    // Convert map to array and sort by creation date (newest first)
    return Array.from(ordersMap.values()).sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime()
    );
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw error;
  }
}