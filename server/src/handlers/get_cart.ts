import { db } from '../db';
import { cartItemsTable, jewelryItemsTable } from '../db/schema';
import { type CartWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCart(sessionId: string): Promise<CartWithItems[]> {
  try {
    // Query cart items with joined jewelry item details
    const results = await db.select()
      .from(cartItemsTable)
      .innerJoin(jewelryItemsTable, eq(cartItemsTable.jewelry_item_id, jewelryItemsTable.id))
      .where(eq(cartItemsTable.session_id, sessionId))
      .execute();

    // Transform joined results to match CartWithItems schema
    return results.map(result => ({
      id: result.cart_items.id,
      session_id: result.cart_items.session_id,
      quantity: result.cart_items.quantity,
      created_at: result.cart_items.created_at,
      updated_at: result.cart_items.updated_at,
      jewelry_item: {
        ...result.jewelry_items,
        price: parseFloat(result.jewelry_items.price) // Convert numeric to number
      }
    }));
  } catch (error) {
    console.error('Get cart failed:', error);
    throw error;
  }
}