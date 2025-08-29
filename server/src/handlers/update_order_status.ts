import { db } from '../db';
import { ordersTable, orderItemsTable, jewelryItemsTable } from '../db/schema';
import { type OrderStatus, type OrderWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<OrderWithItems | null> {
  try {
    // Update order status
    const updateResult = await db.update(ordersTable)
      .set({ 
        status: status,
        updated_at: new Date()
      })
      .where(eq(ordersTable.id, id))
      .returning()
      .execute();

    // Return null if order not found
    if (updateResult.length === 0) {
      return null;
    }

    const updatedOrder = updateResult[0];

    // Get order items with jewelry item details
    const orderItems = await db.select({
      id: orderItemsTable.id,
      quantity: orderItemsTable.quantity,
      price_at_time: orderItemsTable.price_at_time,
      jewelry_item: {
        id: jewelryItemsTable.id,
        name: jewelryItemsTable.name,
        description: jewelryItemsTable.description,
        materials: jewelryItemsTable.materials,
        category: jewelryItemsTable.category,
        price: jewelryItemsTable.price,
        image_url: jewelryItemsTable.image_url,
        stock_quantity: jewelryItemsTable.stock_quantity,
        is_featured: jewelryItemsTable.is_featured,
        created_at: jewelryItemsTable.created_at,
        updated_at: jewelryItemsTable.updated_at
      }
    })
    .from(orderItemsTable)
    .innerJoin(jewelryItemsTable, eq(orderItemsTable.jewelry_item_id, jewelryItemsTable.id))
    .where(eq(orderItemsTable.order_id, id))
    .execute();

    // Convert numeric fields and structure the response
    return {
      id: updatedOrder.id,
      session_id: updatedOrder.session_id,
      customer_name: updatedOrder.customer_name,
      customer_email: updatedOrder.customer_email,
      customer_phone: updatedOrder.customer_phone,
      shipping_address: updatedOrder.shipping_address,
      billing_address: updatedOrder.billing_address,
      total_amount: parseFloat(updatedOrder.total_amount), // Convert numeric to number
      status: updatedOrder.status,
      notes: updatedOrder.notes,
      created_at: updatedOrder.created_at,
      updated_at: updatedOrder.updated_at,
      items: orderItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price_at_time: parseFloat(item.price_at_time), // Convert numeric to number
        jewelry_item: {
          ...item.jewelry_item,
          price: parseFloat(item.jewelry_item.price) // Convert numeric to number
        }
      }))
    };
  } catch (error) {
    console.error('Order status update failed:', error);
    throw error;
  }
}