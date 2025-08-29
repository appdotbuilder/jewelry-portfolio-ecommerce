import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { type UpdateJewelryItemInput } from '../schema';
import { updateJewelryItem } from '../handlers/update_jewelry_item';
import { eq } from 'drizzle-orm';

describe('updateJewelryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test jewelry item
  const createTestItem = async () => {
    const result = await db.insert(jewelryItemsTable)
      .values({
        name: 'Original Ring',
        description: 'Original description',
        materials: 'gold, diamond',
        category: 'rings',
        price: '199.99',
        image_url: 'https://example.com/ring.jpg',
        stock_quantity: 10,
        is_featured: false
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should update all fields of a jewelry item', async () => {
    // Create test item
    const testItem = await createTestItem();
    
    const updateInput: UpdateJewelryItemInput = {
      id: testItem.id,
      name: 'Updated Ring',
      description: 'Updated description',
      materials: 'platinum, emerald',
      category: 'necklaces',
      price: 299.99,
      image_url: 'https://example.com/updated-ring.jpg',
      stock_quantity: 5,
      is_featured: true
    };

    const result = await updateJewelryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testItem.id);
    expect(result!.name).toEqual('Updated Ring');
    expect(result!.description).toEqual('Updated description');
    expect(result!.materials).toEqual('platinum, emerald');
    expect(result!.category).toEqual('necklaces');
    expect(result!.price).toEqual(299.99);
    expect(typeof result!.price).toEqual('number');
    expect(result!.image_url).toEqual('https://example.com/updated-ring.jpg');
    expect(result!.stock_quantity).toEqual(5);
    expect(result!.is_featured).toEqual(true);
    expect(result!.created_at).toEqual(testItem.created_at);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > testItem.updated_at).toBe(true);
  });

  it('should update partial fields of a jewelry item', async () => {
    // Create test item
    const testItem = await createTestItem();
    
    const updateInput: UpdateJewelryItemInput = {
      id: testItem.id,
      name: 'Partially Updated Ring',
      price: 249.99,
      is_featured: true
    };

    const result = await updateJewelryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testItem.id);
    expect(result!.name).toEqual('Partially Updated Ring');
    expect(result!.description).toEqual('Original description'); // Unchanged
    expect(result!.materials).toEqual('gold, diamond'); // Unchanged
    expect(result!.category).toEqual('rings'); // Unchanged
    expect(result!.price).toEqual(249.99);
    expect(typeof result!.price).toEqual('number');
    expect(result!.image_url).toEqual('https://example.com/ring.jpg'); // Unchanged
    expect(result!.stock_quantity).toEqual(10); // Unchanged
    expect(result!.is_featured).toEqual(true);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > testItem.updated_at).toBe(true);
  });

  it('should save updated item to database', async () => {
    // Create test item
    const testItem = await createTestItem();
    
    const updateInput: UpdateJewelryItemInput = {
      id: testItem.id,
      name: 'Database Updated Ring',
      price: 349.99
    };

    await updateJewelryItem(updateInput);

    // Query database directly to verify changes
    const items = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, testItem.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toEqual('Database Updated Ring');
    expect(parseFloat(items[0].price)).toEqual(349.99);
    expect(items[0].updated_at).toBeInstanceOf(Date);
    expect(items[0].updated_at > testItem.updated_at).toBe(true);
  });

  it('should handle nullable fields correctly', async () => {
    // Create test item
    const testItem = await createTestItem();
    
    const updateInput: UpdateJewelryItemInput = {
      id: testItem.id,
      image_url: null // Setting to null
    };

    const result = await updateJewelryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.image_url).toBeNull();
    
    // Verify in database
    const items = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, testItem.id))
      .execute();

    expect(items[0].image_url).toBeNull();
  });

  it('should handle different jewelry categories', async () => {
    // Create test item
    const testItem = await createTestItem();
    
    const categories = ['rings', 'earrings', 'necklaces', 'cufflinks'] as const;
    
    for (const category of categories) {
      const updateInput: UpdateJewelryItemInput = {
        id: testItem.id,
        category: category
      };

      const result = await updateJewelryItem(updateInput);
      expect(result!.category).toEqual(category);
    }
  });

  it('should return null when item does not exist', async () => {
    const updateInput: UpdateJewelryItemInput = {
      id: 99999, // Non-existent ID
      name: 'Updated Name'
    };

    const result = await updateJewelryItem(updateInput);

    expect(result).toBeNull();
  });

  it('should return existing item when no update fields provided', async () => {
    // Create test item
    const testItem = await createTestItem();
    
    const updateInput: UpdateJewelryItemInput = {
      id: testItem.id
      // No update fields provided
    };

    const result = await updateJewelryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testItem.id);
    expect(result!.name).toEqual('Original Ring');
    expect(result!.price).toEqual(199.99);
    expect(typeof result!.price).toEqual('number');
    expect(result!.updated_at).toEqual(testItem.updated_at); // Should not be updated
  });

  it('should handle zero stock quantity correctly', async () => {
    // Create test item
    const testItem = await createTestItem();
    
    const updateInput: UpdateJewelryItemInput = {
      id: testItem.id,
      stock_quantity: 0
    };

    const result = await updateJewelryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.stock_quantity).toEqual(0);
  });

  it('should handle price precision correctly', async () => {
    // Create test item
    const testItem = await createTestItem();
    
    const updateInput: UpdateJewelryItemInput = {
      id: testItem.id,
      price: 123.45
    };

    const result = await updateJewelryItem(updateInput);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(123.45);
    expect(typeof result!.price).toEqual('number');
    
    // Verify precision in database
    const items = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, testItem.id))
      .execute();

    expect(parseFloat(items[0].price)).toEqual(123.45);
  });
});