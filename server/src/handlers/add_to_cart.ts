import { db } from '../db';
import { cartItemsTable, jewelryItemsTable } from '../db/schema';
import { type AddToCartInput, type CartWithItems } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addToCart = async (input: AddToCartInput): Promise<CartWithItems> => {
  try {
    // First, verify the jewelry item exists and has sufficient stock
    const jewelryItems = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, input.jewelry_item_id))
      .execute();

    if (jewelryItems.length === 0) {
      throw new Error(`Jewelry item with ID ${input.jewelry_item_id} not found`);
    }

    const jewelryItem = jewelryItems[0];

    if (jewelryItem.stock_quantity < input.quantity) {
      throw new Error(`Insufficient stock. Available: ${jewelryItem.stock_quantity}, requested: ${input.quantity}`);
    }

    // Check if item already exists in cart for this session
    const existingCartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.session_id, input.session_id),
        eq(cartItemsTable.jewelry_item_id, input.jewelry_item_id)
      ))
      .execute();

    let cartItem;

    if (existingCartItems.length > 0) {
      // Update existing cart item quantity
      const existingItem = existingCartItems[0];
      const newQuantity = existingItem.quantity + input.quantity;

      // Check if total quantity would exceed stock
      if (newQuantity > jewelryItem.stock_quantity) {
        throw new Error(`Insufficient stock. Available: ${jewelryItem.stock_quantity}, total requested: ${newQuantity}`);
      }

      const updatedItems = await db.update(cartItemsTable)
        .set({ 
          quantity: newQuantity,
          updated_at: new Date()
        })
        .where(eq(cartItemsTable.id, existingItem.id))
        .returning()
        .execute();

      cartItem = updatedItems[0];
    } else {
      // Create new cart item
      const newItems = await db.insert(cartItemsTable)
        .values({
          session_id: input.session_id,
          jewelry_item_id: input.jewelry_item_id,
          quantity: input.quantity
        })
        .returning()
        .execute();

      cartItem = newItems[0];
    }

    // Return cart item with jewelry item details
    return {
      id: cartItem.id,
      session_id: cartItem.session_id,
      quantity: cartItem.quantity,
      jewelry_item: {
        ...jewelryItem,
        price: parseFloat(jewelryItem.price) // Convert numeric to number
      },
      created_at: cartItem.created_at,
      updated_at: cartItem.updated_at
    };
  } catch (error) {
    console.error('Add to cart failed:', error);
    throw error;
  }
};