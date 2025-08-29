import { db } from '../db';
import { cartItemsTable, ordersTable, orderItemsTable, jewelryItemsTable } from '../db/schema';
import { type CreateOrderInput, type OrderWithItems } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function createOrder(input: CreateOrderInput): Promise<OrderWithItems | null> {
  try {
    // 1. Get all cart items for the session with jewelry item data
    const cartItems = await db.select({
      cartId: cartItemsTable.id,
      quantity: cartItemsTable.quantity,
      jewelryItemId: jewelryItemsTable.id,
      jewelryItemName: jewelryItemsTable.name,
      jewelryItemDescription: jewelryItemsTable.description,
      jewelryItemMaterials: jewelryItemsTable.materials,
      jewelryItemCategory: jewelryItemsTable.category,
      jewelryItemPrice: jewelryItemsTable.price,
      jewelryItemImageUrl: jewelryItemsTable.image_url,
      jewelryItemStockQuantity: jewelryItemsTable.stock_quantity,
      jewelryItemIsFeatured: jewelryItemsTable.is_featured,
      jewelryItemCreatedAt: jewelryItemsTable.created_at,
      jewelryItemUpdatedAt: jewelryItemsTable.updated_at
    })
    .from(cartItemsTable)
    .innerJoin(jewelryItemsTable, eq(cartItemsTable.jewelry_item_id, jewelryItemsTable.id))
    .where(eq(cartItemsTable.session_id, input.session_id))
    .execute();

    // Return null if cart is empty
    if (cartItems.length === 0) {
      return null;
    }

    // 2. Validate stock availability
    for (const item of cartItems) {
      if (item.quantity > item.jewelryItemStockQuantity) {
        return null; // Insufficient stock
      }
    }

    // 3. Calculate total amount
    let totalAmount = 0;
    for (const item of cartItems) {
      const itemPrice = parseFloat(item.jewelryItemPrice);
      totalAmount += itemPrice * item.quantity;
    }

    // 4. Create order and order items in a transaction
    const result = await db.transaction(async (tx) => {
      // Create the order
      const orderResult = await tx.insert(ordersTable)
        .values({
          session_id: input.session_id,
          customer_name: input.customer_name,
          customer_email: input.customer_email,
          customer_phone: input.customer_phone,
          shipping_address: input.shipping_address,
          billing_address: input.billing_address,
          total_amount: totalAmount.toString(),
          notes: input.notes
        })
        .returning()
        .execute();

      const order = orderResult[0];

      // Create order items and update stock quantities
      const orderItems = [];
      for (const cartItem of cartItems) {
        // Create order item
        const orderItemResult = await tx.insert(orderItemsTable)
          .values({
            order_id: order.id,
            jewelry_item_id: cartItem.jewelryItemId,
            quantity: cartItem.quantity,
            price_at_time: cartItem.jewelryItemPrice
          })
          .returning()
          .execute();

        orderItems.push(orderItemResult[0]);

        // Update stock quantity
        await tx.update(jewelryItemsTable)
          .set({
            stock_quantity: sql`${jewelryItemsTable.stock_quantity} - ${cartItem.quantity}`,
            updated_at: sql`now()`
          })
          .where(eq(jewelryItemsTable.id, cartItem.jewelryItemId))
          .execute();
      }

      // 5. Clear the cart
      await tx.delete(cartItemsTable)
        .where(eq(cartItemsTable.session_id, input.session_id))
        .execute();

      return { order, orderItems, cartItems };
    });

    // Build the response with proper type conversions
    const orderWithItems: OrderWithItems = {
      id: result.order.id,
      session_id: result.order.session_id,
      customer_name: result.order.customer_name,
      customer_email: result.order.customer_email,
      customer_phone: result.order.customer_phone,
      shipping_address: result.order.shipping_address,
      billing_address: result.order.billing_address,
      total_amount: parseFloat(result.order.total_amount),
      status: result.order.status,
      notes: result.order.notes,
      created_at: result.order.created_at,
      updated_at: result.order.updated_at,
      items: result.orderItems.map((orderItem, index) => {
        const cartItem = result.cartItems[index];
        return {
          id: orderItem.id,
          quantity: orderItem.quantity,
          price_at_time: parseFloat(orderItem.price_at_time),
          jewelry_item: {
            id: cartItem.jewelryItemId,
            name: cartItem.jewelryItemName,
            description: cartItem.jewelryItemDescription,
            materials: cartItem.jewelryItemMaterials,
            category: cartItem.jewelryItemCategory,
            price: parseFloat(cartItem.jewelryItemPrice),
            image_url: cartItem.jewelryItemImageUrl,
            stock_quantity: cartItem.jewelryItemStockQuantity,
            is_featured: cartItem.jewelryItemIsFeatured,
            created_at: cartItem.jewelryItemCreatedAt,
            updated_at: cartItem.jewelryItemUpdatedAt
          }
        };
      })
    };

    return orderWithItems;
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
}