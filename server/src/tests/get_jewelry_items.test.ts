import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { type CreateJewelryItemInput } from '../schema';
import { getJewelryItems } from '../handlers/get_jewelry_items';

// Test data for different categories
const testRing: CreateJewelryItemInput = {
  name: 'Diamond Engagement Ring',
  description: 'Beautiful diamond ring',
  materials: 'Gold, Diamond',
  category: 'rings',
  price: 1500.99,
  image_url: 'https://example.com/ring.jpg',
  stock_quantity: 5,
  is_featured: true
};

const testEarrings: CreateJewelryItemInput = {
  name: 'Pearl Earrings',
  description: 'Elegant pearl earrings',
  materials: 'Silver, Pearl',
  category: 'earrings',
  price: 299.50,
  image_url: 'https://example.com/earrings.jpg',
  stock_quantity: 10,
  is_featured: false
};

const testNecklace: CreateJewelryItemInput = {
  name: 'Gold Chain Necklace',
  description: 'Classic gold chain',
  materials: 'Gold',
  category: 'necklaces',
  price: 899.99,
  image_url: null,
  stock_quantity: 3,
  is_featured: true
};

const testCufflinks: CreateJewelryItemInput = {
  name: 'Silver Cufflinks',
  description: 'Professional silver cufflinks',
  materials: 'Silver',
  category: 'cufflinks',
  price: 150.00,
  image_url: 'https://example.com/cufflinks.jpg',
  stock_quantity: 8,
  is_featured: false
};

describe('getJewelryItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no items exist', async () => {
    const result = await getJewelryItems();
    expect(result).toEqual([]);
  });

  it('should return all jewelry items when no filters applied', async () => {
    // Create test items
    await db.insert(jewelryItemsTable).values([
      {
        ...testRing,
        price: testRing.price.toString()
      },
      {
        ...testEarrings,
        price: testEarrings.price.toString()
      }
    ]).execute();

    const result = await getJewelryItems();

    expect(result).toHaveLength(2);
    
    // Verify numeric conversion
    expect(typeof result[0].price).toBe('number');
    expect(typeof result[1].price).toBe('number');
    
    // Verify data integrity
    const ring = result.find(item => item.category === 'rings');
    const earrings = result.find(item => item.category === 'earrings');
    
    expect(ring).toBeDefined();
    expect(ring!.name).toBe('Diamond Engagement Ring');
    expect(ring!.price).toBe(1500.99);
    expect(ring!.is_featured).toBe(true);
    
    expect(earrings).toBeDefined();
    expect(earrings!.name).toBe('Pearl Earrings');
    expect(earrings!.price).toBe(299.50);
    expect(earrings!.is_featured).toBe(false);
  });

  it('should filter by category correctly', async () => {
    // Create items in different categories
    await db.insert(jewelryItemsTable).values([
      {
        ...testRing,
        price: testRing.price.toString()
      },
      {
        ...testEarrings,
        price: testEarrings.price.toString()
      },
      {
        ...testNecklace,
        price: testNecklace.price.toString()
      }
    ]).execute();

    // Test filtering by rings
    const ringsResult = await getJewelryItems('rings');
    expect(ringsResult).toHaveLength(1);
    expect(ringsResult[0].category).toBe('rings');
    expect(ringsResult[0].name).toBe('Diamond Engagement Ring');

    // Test filtering by earrings
    const earringsResult = await getJewelryItems('earrings');
    expect(earringsResult).toHaveLength(1);
    expect(earringsResult[0].category).toBe('earrings');
    expect(earringsResult[0].name).toBe('Pearl Earrings');

    // Test filtering by necklaces
    const necklacesResult = await getJewelryItems('necklaces');
    expect(necklacesResult).toHaveLength(1);
    expect(necklacesResult[0].category).toBe('necklaces');
    expect(necklacesResult[0].name).toBe('Gold Chain Necklace');

    // Test filtering by category with no items
    const cufflinksResult = await getJewelryItems('cufflinks');
    expect(cufflinksResult).toHaveLength(0);
  });

  it('should filter by featured items correctly', async () => {
    // Create mix of featured and non-featured items
    await db.insert(jewelryItemsTable).values([
      {
        ...testRing, // featured: true
        price: testRing.price.toString()
      },
      {
        ...testEarrings, // featured: false
        price: testEarrings.price.toString()
      },
      {
        ...testNecklace, // featured: true
        price: testNecklace.price.toString()
      },
      {
        ...testCufflinks, // featured: false
        price: testCufflinks.price.toString()
      }
    ]).execute();

    const featuredResult = await getJewelryItems(undefined, true);
    
    expect(featuredResult).toHaveLength(2);
    expect(featuredResult.every(item => item.is_featured)).toBe(true);
    
    const featuredNames = featuredResult.map(item => item.name).sort();
    expect(featuredNames).toEqual(['Diamond Engagement Ring', 'Gold Chain Necklace']);
  });

  it('should apply both category and featured filters', async () => {
    // Create items with different combinations
    await db.insert(jewelryItemsTable).values([
      {
        ...testRing, // rings, featured: true
        price: testRing.price.toString()
      },
      {
        ...testEarrings, // earrings, featured: false
        price: testEarrings.price.toString()
      },
      {
        ...testNecklace, // necklaces, featured: true
        price: testNecklace.price.toString()
      },
      {
        name: 'Special Ring',
        description: 'Another ring',
        materials: 'Platinum',
        category: 'rings',
        price: '2000.00',
        image_url: null,
        stock_quantity: 1,
        is_featured: false
      }
    ]).execute();

    // Test rings + featured filter
    const featuredRingsResult = await getJewelryItems('rings', true);
    
    expect(featuredRingsResult).toHaveLength(1);
    expect(featuredRingsResult[0].category).toBe('rings');
    expect(featuredRingsResult[0].is_featured).toBe(true);
    expect(featuredRingsResult[0].name).toBe('Diamond Engagement Ring');

    // Test category with no featured items
    const featuredEarringsResult = await getJewelryItems('earrings', true);
    expect(featuredEarringsResult).toHaveLength(0);
  });

  it('should handle all jewelry categories correctly', async () => {
    // Create one item for each category
    await db.insert(jewelryItemsTable).values([
      {
        ...testRing,
        price: testRing.price.toString()
      },
      {
        ...testEarrings,
        price: testEarrings.price.toString()
      },
      {
        ...testNecklace,
        price: testNecklace.price.toString()
      },
      {
        ...testCufflinks,
        price: testCufflinks.price.toString()
      }
    ]).execute();

    // Test each category individually
    const categories = ['rings', 'earrings', 'necklaces', 'cufflinks'] as const;
    
    for (const category of categories) {
      const result = await getJewelryItems(category);
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe(category);
    }

    // Verify all items are returned without filter
    const allItems = await getJewelryItems();
    expect(allItems).toHaveLength(4);
    
    const allCategories = allItems.map(item => item.category).sort();
    expect(allCategories).toEqual(['cufflinks', 'earrings', 'necklaces', 'rings']);
  });

  it('should preserve all item properties correctly', async () => {
    await db.insert(jewelryItemsTable).values({
      ...testNecklace,
      price: testNecklace.price.toString()
    }).execute();

    const result = await getJewelryItems();
    const item = result[0];

    // Verify all properties are present and correctly typed
    expect(typeof item.id).toBe('number');
    expect(typeof item.name).toBe('string');
    expect(typeof item.description).toBe('string');
    expect(typeof item.materials).toBe('string');
    expect(typeof item.category).toBe('string');
    expect(typeof item.price).toBe('number'); // Should be converted from string
    expect(typeof item.stock_quantity).toBe('number');
    expect(typeof item.is_featured).toBe('boolean');
    expect(item.created_at).toBeInstanceOf(Date);
    expect(item.updated_at).toBeInstanceOf(Date);

    // Verify specific values
    expect(item.name).toBe('Gold Chain Necklace');
    expect(item.description).toBe('Classic gold chain');
    expect(item.materials).toBe('Gold');
    expect(item.category).toBe('necklaces');
    expect(item.price).toBe(899.99);
    expect(item.image_url).toBeNull();
    expect(item.stock_quantity).toBe(3);
    expect(item.is_featured).toBe(true);
  });
});