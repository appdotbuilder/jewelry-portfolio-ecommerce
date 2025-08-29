import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { type UpdateJewelryItemInput, type JewelryItem } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateJewelryItem(input: UpdateJewelryItemInput): Promise<JewelryItem | null> {
  try {
    // Extract the ID from input and create update data
    const { id, ...updateData } = input;
    
    // If no fields to update, just return the existing item
    if (Object.keys(updateData).length === 0) {
      const existingItems = await db.select()
        .from(jewelryItemsTable)
        .where(eq(jewelryItemsTable.id, id))
        .execute();
      
      if (existingItems.length === 0) {
        return null;
      }
      
      const item = existingItems[0];
      return {
        ...item,
        price: parseFloat(item.price) // Convert numeric field back to number
      };
    }

    // Prepare update values, converting numeric fields
    const updateValues: any = {};
    
    if (updateData.name !== undefined) {
      updateValues.name = updateData.name;
    }
    if (updateData.description !== undefined) {
      updateValues.description = updateData.description;
    }
    if (updateData.materials !== undefined) {
      updateValues.materials = updateData.materials;
    }
    if (updateData.category !== undefined) {
      updateValues.category = updateData.category;
    }
    if (updateData.price !== undefined) {
      updateValues.price = updateData.price.toString(); // Convert number to string for numeric column
    }
    if (updateData.image_url !== undefined) {
      updateValues.image_url = updateData.image_url;
    }
    if (updateData.stock_quantity !== undefined) {
      updateValues.stock_quantity = updateData.stock_quantity;
    }
    if (updateData.is_featured !== undefined) {
      updateValues.is_featured = updateData.is_featured;
    }
    
    // Add updated_at timestamp
    updateValues.updated_at = new Date();

    // Update the jewelry item
    const result = await db.update(jewelryItemsTable)
      .set(updateValues)
      .where(eq(jewelryItemsTable.id, id))
      .returning()
      .execute();

    // Return null if no item was found/updated
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
    console.error('Jewelry item update failed:', error);
    throw error;
  }
}