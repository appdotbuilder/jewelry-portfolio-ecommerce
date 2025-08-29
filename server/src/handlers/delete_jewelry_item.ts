import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteJewelryItem(id: number): Promise<boolean> {
  try {
    // Delete the jewelry item by ID
    const result = await db.delete(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, id))
      .returning()
      .execute();

    // Return true if an item was deleted, false if no item was found
    return result.length > 0;
  } catch (error) {
    console.error('Jewelry item deletion failed:', error);
    throw error;
  }
}