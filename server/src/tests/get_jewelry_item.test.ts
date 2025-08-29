import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { type CreateJewelryItemInput } from '../schema';
import { getJewelryItem } from '../handlers/get_jewelry_item';

// Test jewelry item data
const testJewelryItem: CreateJewelryItemInput = {
  name: 'Diamond Engagement Ring',
  description: 'Beautiful 14k gold engagement ring with 1 carat diamond',
  materials: '14k gold, diamond, platinum',
  category: 'rings',
  price: 2499.99,
  image_url: 'https://example.com/ring.jpg',
  stock_quantity: 5,
  is_featured: true
};

const testJewelryItem2: CreateJewelryItemInput = {
  name: 'Pearl Earrings',
  description: 'Classic white pearl earrings',
  materials: 'sterling silver, pearls',
  category: 'earrings',
  price: 149.50,
  image_url: null,
  stock_quantity: 20,
  is_featured: false
};

describe('getJewelryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a jewelry item by ID', async () => {
    // Create test jewelry item
    const insertResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem,
        price: testJewelryItem.price.toString() // Convert to string for insertion
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];
    
    // Test the handler
    const result = await getJewelryItem(createdItem.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(createdItem.id);
    expect(result!.name).toEqual('Diamond Engagement Ring');
    expect(result!.description).toEqual(testJewelryItem.description);
    expect(result!.materials).toEqual(testJewelryItem.materials);
    expect(result!.category).toEqual('rings');
    expect(result!.price).toEqual(2499.99);
    expect(typeof result!.price).toEqual('number');
    expect(result!.image_url).toEqual('https://example.com/ring.jpg');
    expect(result!.stock_quantity).toEqual(5);
    expect(result!.is_featured).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent jewelry item', async () => {
    const result = await getJewelryItem(999);
    
    expect(result).toBeNull();
  });

  it('should handle items with null image_url', async () => {
    // Create test item with null image_url
    const insertResult = await db.insert(jewelryItemsTable)
      .values({
        ...testJewelryItem2,
        price: testJewelryItem2.price.toString()
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];
    
    const result = await getJewelryItem(createdItem.id);

    expect(result).toBeDefined();
    expect(result!.name).toEqual('Pearl Earrings');
    expect(result!.price).toEqual(149.50);
    expect(typeof result!.price).toEqual('number');
    expect(result!.image_url).toBeNull();
    expect(result!.is_featured).toEqual(false);
  });

  it('should correctly handle different jewelry categories', async () => {
    // Create items for each category
    const categories = ['rings', 'earrings', 'necklaces', 'cufflinks'] as const;
    const createdItems: number[] = [];

    for (const category of categories) {
      const item = {
        name: `Test ${category}`,
        description: `Test ${category} description`,
        materials: 'gold, silver',
        category,
        price: '99.99',
        image_url: null,
        stock_quantity: 10,
        is_featured: false
      };

      const insertResult = await db.insert(jewelryItemsTable)
        .values(item)
        .returning()
        .execute();
      
      createdItems.push(insertResult[0].id);
    }

    // Test each created item
    for (let i = 0; i < categories.length; i++) {
      const result = await getJewelryItem(createdItems[i]);
      
      expect(result).toBeDefined();
      expect(result!.category).toEqual(categories[i]);
      expect(result!.name).toEqual(`Test ${categories[i]}`);
      expect(result!.price).toEqual(99.99);
      expect(typeof result!.price).toEqual('number');
    }
  });

  it('should handle decimal prices correctly', async () => {
    // Test with various decimal prices
    const prices = [0.01, 10.50, 999.99, 1234.56];
    const createdItems: number[] = [];

    for (const price of prices) {
      const item = {
        name: `Item $${price}`,
        description: 'Test item',
        materials: 'test materials',
        category: 'rings' as const,
        price: price.toString(),
        image_url: null,
        stock_quantity: 1,
        is_featured: false
      };

      const insertResult = await db.insert(jewelryItemsTable)
        .values(item)
        .returning()
        .execute();
      
      createdItems.push(insertResult[0].id);
    }

    // Verify each price is handled correctly
    for (let i = 0; i < prices.length; i++) {
      const result = await getJewelryItem(createdItems[i]);
      
      expect(result).toBeDefined();
      expect(result!.price).toEqual(prices[i]);
      expect(typeof result!.price).toEqual('number');
    }
  });
});