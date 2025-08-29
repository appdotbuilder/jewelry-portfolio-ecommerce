import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jewelryItemsTable } from '../db/schema';
import { type CreateJewelryItemInput } from '../schema';
import { createJewelryItem } from '../handlers/create_jewelry_item';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateJewelryItemInput = {
  name: 'Elegant Diamond Ring',
  description: 'A beautiful diamond ring crafted with precision',
  materials: 'gold, diamond',
  category: 'rings',
  price: 1299.99,
  image_url: 'https://example.com/ring.jpg',
  stock_quantity: 5,
  is_featured: true
};

// Test input with minimal required fields
const minimalTestInput: CreateJewelryItemInput = {
  name: 'Simple Silver Earrings',
  description: 'Classic silver earrings',
  materials: 'silver',
  category: 'earrings',
  price: 89.99,
  image_url: null,
  stock_quantity: 10
  // is_featured is optional and should default to false
};

describe('createJewelryItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a jewelry item with all fields', async () => {
    const result = await createJewelryItem(testInput);

    // Basic field validation
    expect(result.name).toEqual('Elegant Diamond Ring');
    expect(result.description).toEqual(testInput.description);
    expect(result.materials).toEqual('gold, diamond');
    expect(result.category).toEqual('rings');
    expect(result.price).toEqual(1299.99);
    expect(typeof result.price).toEqual('number');
    expect(result.image_url).toEqual('https://example.com/ring.jpg');
    expect(result.stock_quantity).toEqual(5);
    expect(result.is_featured).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a jewelry item with minimal fields and apply defaults', async () => {
    const result = await createJewelryItem(minimalTestInput);

    // Basic field validation
    expect(result.name).toEqual('Simple Silver Earrings');
    expect(result.description).toEqual(minimalTestInput.description);
    expect(result.materials).toEqual('silver');
    expect(result.category).toEqual('earrings');
    expect(result.price).toEqual(89.99);
    expect(typeof result.price).toEqual('number');
    expect(result.image_url).toBeNull();
    expect(result.stock_quantity).toEqual(10);
    expect(result.is_featured).toEqual(false); // Should default to false
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save jewelry item to database', async () => {
    const result = await createJewelryItem(testInput);

    // Query using proper drizzle syntax
    const jewelryItems = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, result.id))
      .execute();

    expect(jewelryItems).toHaveLength(1);
    expect(jewelryItems[0].name).toEqual('Elegant Diamond Ring');
    expect(jewelryItems[0].description).toEqual(testInput.description);
    expect(jewelryItems[0].materials).toEqual('gold, diamond');
    expect(jewelryItems[0].category).toEqual('rings');
    expect(parseFloat(jewelryItems[0].price)).toEqual(1299.99);
    expect(jewelryItems[0].image_url).toEqual('https://example.com/ring.jpg');
    expect(jewelryItems[0].stock_quantity).toEqual(5);
    expect(jewelryItems[0].is_featured).toEqual(true);
    expect(jewelryItems[0].created_at).toBeInstanceOf(Date);
    expect(jewelryItems[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different jewelry categories', async () => {
    const necklaceInput: CreateJewelryItemInput = {
      name: 'Pearl Necklace',
      description: 'Elegant pearl necklace',
      materials: 'pearl, gold chain',
      category: 'necklaces',
      price: 599.99,
      image_url: null,
      stock_quantity: 3,
      is_featured: false
    };

    const result = await createJewelryItem(necklaceInput);

    expect(result.category).toEqual('necklaces');
    expect(result.name).toEqual('Pearl Necklace');
    expect(result.materials).toEqual('pearl, gold chain');
    expect(result.price).toEqual(599.99);
  });

  it('should handle cufflinks category', async () => {
    const cufflinksInput: CreateJewelryItemInput = {
      name: 'Silver Cufflinks',
      description: 'Classic silver cufflinks for formal wear',
      materials: 'sterling silver',
      category: 'cufflinks',
      price: 159.99,
      image_url: 'https://example.com/cufflinks.jpg',
      stock_quantity: 8,
      is_featured: true
    };

    const result = await createJewelryItem(cufflinksInput);

    expect(result.category).toEqual('cufflinks');
    expect(result.name).toEqual('Silver Cufflinks');
    expect(result.materials).toEqual('sterling silver');
    expect(result.is_featured).toEqual(true);
  });

  it('should handle zero stock quantity', async () => {
    const outOfStockInput: CreateJewelryItemInput = {
      name: 'Rare Vintage Ring',
      description: 'A rare vintage ring, currently out of stock',
      materials: 'vintage gold, antique diamond',
      category: 'rings',
      price: 2999.99,
      image_url: null,
      stock_quantity: 0,
      is_featured: false
    };

    const result = await createJewelryItem(outOfStockInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.name).toEqual('Rare Vintage Ring');
    expect(result.price).toEqual(2999.99);
  });

  it('should handle high precision prices correctly', async () => {
    const precisionPriceInput: CreateJewelryItemInput = {
      name: 'Precision Priced Item',
      description: 'Item with precise pricing',
      materials: 'gold',
      category: 'rings',
      price: 123.45,
      image_url: null,
      stock_quantity: 1,
      is_featured: false
    };

    const result = await createJewelryItem(precisionPriceInput);

    // Verify numeric conversion maintains precision
    expect(result.price).toEqual(123.45);
    expect(typeof result.price).toEqual('number');

    // Verify in database
    const dbItem = await db.select()
      .from(jewelryItemsTable)
      .where(eq(jewelryItemsTable.id, result.id))
      .execute();

    expect(parseFloat(dbItem[0].price)).toEqual(123.45);
  });
});