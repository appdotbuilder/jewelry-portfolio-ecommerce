import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { type CreateJewelryItemInput } from '../schema';
import { deleteJewelryItem } from '../handlers/delete_jewelry_item';
import { eq } from 'drizzle-orm';

// Test data for creating jewelry items
const testJewelryItem1: CreateJewelryItemInput = {
  name: 'Diamond Ring',
  description: 'A beautiful diamond engagement ring',
  materials: 'gold, diamond',
  category: 'rings',
  price: 1200.50,
  image_url: 'https://example.com/diamond-ring.jpg',
  stock_quantity: 5,
  is_featured: true
};

const testJewelryItem2: CreateJewelryItemInput = {
  name: 'Pearl Earrings',
  description: 'Elegant pearl drop earrings',
  materials: 'silver, pearl',
  category: 'earrings',
  price: 350.00,
  image_url: null,
  stock_quantity: 10,
  is_featured: false
};

describe('deleteJewelryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing jewelry item and return true', async () => {
    // Create a jewelry item first
    const createResult = await db.insert(jewelryItemsTable)
      .values({
        name: testJewelryItem1.name,
        description: testJewelryItem1.description,
        materials: testJewelryItem1.materials,
        category: testJewelryItem1.category,
        price: testJewelryItem1.price.toString(),
        image_url: testJewelryItem1.image_url,
        stock_quantity: testJewelryItem1.stock_quantity,
        is_featured: testJewelryItem1.is_featured
      })
      .returning()
      .execute();

    const createdItem = createResult[0];

    // Delete the jewelry item
    const result = await deleteJewelryItem(createdItem.id);

    // Should return true indicating successful deletion
    expect(result).toBe(true);

    // Verify the item is no longer in the database
    const deletedItems = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, createdItem.id))
      .execute();

    expect(deletedItems).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent jewelry item', async () => {
    // Try to delete an item with an ID that doesn't exist
    const result = await deleteJewelryItem(99999);

    // Should return false indicating no item was found/deleted
    expect(result).toBe(false);
  });

  it('should only delete the specified item and leave others intact', async () => {
    // Create two jewelry items
    const createResults = await db.insert(jewelryItemsTable)
      .values([
        {
          name: testJewelryItem1.name,
          description: testJewelryItem1.description,
          materials: testJewelryItem1.materials,
          category: testJewelryItem1.category,
          price: testJewelryItem1.price.toString(),
          image_url: testJewelryItem1.image_url,
          stock_quantity: testJewelryItem1.stock_quantity,
          is_featured: testJewelryItem1.is_featured
        },
        {
          name: testJewelryItem2.name,
          description: testJewelryItem2.description,
          materials: testJewelryItem2.materials,
          category: testJewelryItem2.category,
          price: testJewelryItem2.price.toString(),
          image_url: testJewelryItem2.image_url,
          stock_quantity: testJewelryItem2.stock_quantity,
          is_featured: testJewelryItem2.is_featured
        }
      ])
      .returning()
      .execute();

    const item1 = createResults[0];
    const item2 = createResults[1];

    // Delete only the first item
    const result = await deleteJewelryItem(item1.id);

    expect(result).toBe(true);

    // Verify first item is deleted
    const deletedItems = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, item1.id))
      .execute();

    expect(deletedItems).toHaveLength(0);

    // Verify second item still exists
    const remainingItems = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, item2.id))
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].name).toBe(testJewelryItem2.name);
  });

  it('should handle deletion of featured items correctly', async () => {
    // Create a featured jewelry item
    const createResult = await db.insert(jewelryItemsTable)
      .values({
        name: testJewelryItem1.name,
        description: testJewelryItem1.description,
        materials: testJewelryItem1.materials,
        category: testJewelryItem1.category,
        price: testJewelryItem1.price.toString(),
        image_url: testJewelryItem1.image_url,
        stock_quantity: testJewelryItem1.stock_quantity,
        is_featured: true
      })
      .returning()
      .execute();

    const createdItem = createResult[0];

    // Delete the featured item
    const result = await deleteJewelryItem(createdItem.id);

    expect(result).toBe(true);

    // Verify the featured item is completely removed
    const deletedItems = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, createdItem.id))
      .execute();

    expect(deletedItems).toHaveLength(0);
  });

  it('should delete items with different categories correctly', async () => {
    // Create items in different categories
    const createResults = await db.insert(jewelryItemsTable)
      .values([
        {
          name: 'Gold Necklace',
          description: 'Beautiful gold chain necklace',
          materials: 'gold',
          category: 'necklaces',
          price: '800.00',
          image_url: null,
          stock_quantity: 3,
          is_featured: false
        },
        {
          name: 'Silver Cufflinks',
          description: 'Classic silver cufflinks for formal wear',
          materials: 'silver',
          category: 'cufflinks',
          price: '150.00',
          image_url: 'https://example.com/cufflinks.jpg',
          stock_quantity: 12,
          is_featured: false
        }
      ])
      .returning()
      .execute();

    const necklace = createResults[0];
    const cufflinks = createResults[1];

    // Delete the necklace
    const result = await deleteJewelryItem(necklace.id);

    expect(result).toBe(true);

    // Verify necklace is deleted
    const deletedNecklace = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, necklace.id))
      .execute();

    expect(deletedNecklace).toHaveLength(0);

    // Verify cufflinks still exist
    const remainingCufflinks = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, cufflinks.id))
      .execute();

    expect(remainingCufflinks).toHaveLength(1);
    expect(remainingCufflinks[0].category).toBe('cufflinks');
  });
});