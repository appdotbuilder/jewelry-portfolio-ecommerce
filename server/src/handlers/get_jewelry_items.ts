import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { type JewelryItem, type JewelryCategory } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export async function getJewelryItems(
  category?: JewelryCategory, 
  featuredOnly?: boolean
): Promise<JewelryItem[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    if (category) {
      conditions.push(eq(jewelryItemsTable.category, category));
    }
    
    if (featuredOnly) {
      conditions.push(eq(jewelryItemsTable.is_featured, true));
    }
    
    // Build query with conditions
    const results = conditions.length === 0
      ? await db.select().from(jewelryItemsTable).execute()
      : conditions.length === 1
        ? await db.select().from(jewelryItemsTable).where(conditions[0]).execute()
        : await db.select().from(jewelryItemsTable).where(and(...conditions)).execute();
    
    // Convert numeric fields back to numbers for response
    return results.map(item => ({
      ...item,
      price: parseFloat(item.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch jewelry items:', error);
    throw error;
  }
}