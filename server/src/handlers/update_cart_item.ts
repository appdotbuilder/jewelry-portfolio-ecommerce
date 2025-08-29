import { db } from '../db';
import { cartItemsTable, jewelryItemsTable } from '../db/schema';
import { type UpdateCartItemInput, type CartWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateCartItem(input: UpdateCartItemInput): Promise<CartWithItems | null> {
  try {
    // Update the cart item quantity
    const updateResult = await db
      .update(cartItemsTable)
      .set({ 
        quantity: input.quantity,
        updated_at: new Date()
      })
      .where(eq(cartItemsTable.id, input.id))
      .returning()
      .execute();

    // If no rows were updated, cart item doesn't exist
    if (updateResult.length === 0) {
      return null;
    }

    // Get the updated cart item with jewelry item details
    const cartWithItemsResult = await db
      .select()
      .from(cartItemsTable)
      .innerJoin(
        jewelryItemsTable,
        eq(cartItemsTable.jewelry_item_id, jewelryItemsTable.id)
      )
      .where(eq(cartItemsTable.id, input.id))
      .execute();

    if (cartWithItemsResult.length === 0) {
      return null;
    }

    const result = cartWithItemsResult[0];
    
    // Return the cart item with jewelry item details, converting numeric fields
    return {
      id: result.cart_items.id,
      session_id: result.cart_items.session_id,
      quantity: result.cart_items.quantity,
      created_at: result.cart_items.created_at,
      updated_at: result.cart_items.updated_at,
      jewelry_item: {
        id: result.jewelry_items.id,
        name: result.jewelry_items.name,
        description: result.jewelry_items.description,
        materials: result.jewelry_items.materials,
        category: result.jewelry_items.category,
        price: parseFloat(result.jewelry_items.price), // Convert numeric to number
        image_url: result.jewelry_items.image_url,
        stock_quantity: result.jewelry_items.stock_quantity,
        is_featured: result.jewelry_items.is_featured,
        created_at: result.jewelry_items.created_at,
        updated_at: result.jewelry_items.updated_at
      }
    };
  } catch (error) {
    console.error('Cart item update failed:', error);
    throw error;
  }
}