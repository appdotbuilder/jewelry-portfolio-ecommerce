import { db } from '../db';
import { cartItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function removeFromCart(cartItemId: number): Promise<boolean> {
  try {
    // Delete the cart item by ID
    const result = await db.delete(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItemId))
      .returning()
      .execute();

    // Return true if an item was deleted, false if no item was found
    return result.length > 0;
  } catch (error) {
    console.error('Failed to remove item from cart:', error);
    throw error;
  }
}