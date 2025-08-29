import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type JewelryItem } from '../schema';

export const getJewelryItem = async (id: number): Promise<JewelryItem | null> => {
  try {
    // Query single jewelry item by ID
    const result = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, id))
      .execute();

    // Return null if item not found
    if (result.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      price: parseFloat(item.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Get jewelry item failed:', error);
    throw error;
  }
};