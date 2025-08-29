import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { type CreateJewelryItemInput, type JewelryItem } from '../schema';

export const createJewelryItem = async (input: CreateJewelryItemInput): Promise<JewelryItem> => {
  try {
    // Insert jewelry item record
    const result = await db.insert(jewelryItemsTable)
      .values({
        name: input.name,
        description: input.description,
        materials: input.materials,
        category: input.category,
        price: input.price.toString(), // Convert number to string for numeric column
        image_url: input.image_url,
        stock_quantity: input.stock_quantity,
        is_featured: input.is_featured || false // Apply default if not provided
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const jewelryItem = result[0];
    return {
      ...jewelryItem,
      price: parseFloat(jewelryItem.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Jewelry item creation failed:', error);
    throw error;
  }
};