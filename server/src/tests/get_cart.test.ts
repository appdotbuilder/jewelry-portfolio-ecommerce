import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { cartItemsTable, jewelryItemsTable } from '../db/schema';
import { getCart } from '../handlers/get_cart';

describe('getCart', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for session with no cart items', async () => {
    const result = await getCart('empty-session-123');
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return cart items with jewelry details for a session', async () => {
    // Create test jewelry item
    const [jewelryItem] = await db.insert(jewelryItemsTable)
      .values({
        name: 'Gold Ring',
        description: 'Beautiful gold ring',
        materials: 'gold, diamond',
        category: 'rings',
        price: '299.99',
        image_url: 'https://example.com/ring.jpg',
        stock_quantity: 10,
        is_featured: true
      })
      .returning()
      .execute();

    // Create test cart item
    const sessionId = 'test-session-123';
    const [cartItem] = await db.insert(cartItemsTable)
      .values({
        session_id: sessionId,
        jewelry_item_id: jewelryItem.id,
        quantity: 2
      })
      .returning()
      .execute();

    const result = await getCart(sessionId);

    expect(result).toHaveLength(1);
    
    const cartWithItem = result[0];
    expect(cartWithItem.id).toBe(cartItem.id);
    expect(cartWithItem.session_id).toBe(sessionId);
    expect(cartWithItem.quantity).toBe(2);
    expect(cartWithItem.created_at).toBeInstanceOf(Date);
    expect(cartWithItem.updated_at).toBeInstanceOf(Date);

    // Verify jewelry item details are included
    expect(cartWithItem.jewelry_item.id).toBe(jewelryItem.id);
    expect(cartWithItem.jewelry_item.name).toBe('Gold Ring');
    expect(cartWithItem.jewelry_item.description).toBe('Beautiful gold ring');
    expect(cartWithItem.jewelry_item.materials).toBe('gold, diamond');
    expect(cartWithItem.jewelry_item.category).toBe('rings');
    expect(cartWithItem.jewelry_item.price).toBe(299.99); // Numeric conversion
    expect(typeof cartWithItem.jewelry_item.price).toBe('number');
    expect(cartWithItem.jewelry_item.image_url).toBe('https://example.com/ring.jpg');
    expect(cartWithItem.jewelry_item.stock_quantity).toBe(10);
    expect(cartWithItem.jewelry_item.is_featured).toBe(true);
  });

  it('should return multiple cart items for a session', async () => {
    // Create test jewelry items
    const [ring] = await db.insert(jewelryItemsTable)
      .values({
        name: 'Silver Ring',
        description: 'Elegant silver ring',
        materials: 'silver',
        category: 'rings',
        price: '149.99',
        image_url: null,
        stock_quantity: 5,
        is_featured: false
      })
      .returning()
      .execute();

    const [necklace] = await db.insert(jewelryItemsTable)
      .values({
        name: 'Pearl Necklace',
        description: 'Classic pearl necklace',
        materials: 'pearl, silver',
        category: 'necklaces',
        price: '399.99',
        image_url: 'https://example.com/necklace.jpg',
        stock_quantity: 3,
        is_featured: true
      })
      .returning()
      .execute();

    // Create multiple cart items
    const sessionId = 'multi-item-session';
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: sessionId,
          jewelry_item_id: ring.id,
          quantity: 1
        },
        {
          session_id: sessionId,
          jewelry_item_id: necklace.id,
          quantity: 3
        }
      ])
      .execute();

    const result = await getCart(sessionId);

    expect(result).toHaveLength(2);

    // Verify both items are returned with correct details
    const ringItem = result.find(item => item.jewelry_item.id === ring.id);
    const necklaceItem = result.find(item => item.jewelry_item.id === necklace.id);

    expect(ringItem).toBeDefined();
    expect(ringItem!.quantity).toBe(1);
    expect(ringItem!.jewelry_item.name).toBe('Silver Ring');
    expect(ringItem!.jewelry_item.price).toBe(149.99);
    expect(ringItem!.jewelry_item.image_url).toBe(null);

    expect(necklaceItem).toBeDefined();
    expect(necklaceItem!.quantity).toBe(3);
    expect(necklaceItem!.jewelry_item.name).toBe('Pearl Necklace');
    expect(necklaceItem!.jewelry_item.price).toBe(399.99);
    expect(necklaceItem!.jewelry_item.category).toBe('necklaces');
  });

  it('should only return cart items for the specified session', async () => {
    // Create test jewelry item
    const [jewelryItem] = await db.insert(jewelryItemsTable)
      .values({
        name: 'Test Earrings',
        description: 'Test earrings',
        materials: 'gold',
        category: 'earrings',
        price: '199.99',
        image_url: null,
        stock_quantity: 8,
        is_featured: false
      })
      .returning()
      .execute();

    // Create cart items for different sessions
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: 'session-1',
          jewelry_item_id: jewelryItem.id,
          quantity: 1
        },
        {
          session_id: 'session-2',
          jewelry_item_id: jewelryItem.id,
          quantity: 2
        },
        {
          session_id: 'session-3',
          jewelry_item_id: jewelryItem.id,
          quantity: 3
        }
      ])
      .execute();

    // Query for session-2 only
    const result = await getCart('session-2');

    expect(result).toHaveLength(1);
    expect(result[0].session_id).toBe('session-2');
    expect(result[0].quantity).toBe(2);
  });

  it('should handle cart items with different jewelry item types', async () => {
    // Create different types of jewelry items
    const jewelryItems = await db.insert(jewelryItemsTable)
      .values([
        {
          name: 'Diamond Cufflinks',
          description: 'Luxury diamond cufflinks',
          materials: 'platinum, diamond',
          category: 'cufflinks',
          price: '899.99',
          image_url: 'https://example.com/cufflinks.jpg',
          stock_quantity: 2,
          is_featured: true
        },
        {
          name: 'Simple Gold Band',
          description: 'Minimalist gold band',
          materials: 'gold',
          category: 'rings',
          price: '199.00',
          image_url: null,
          stock_quantity: 15,
          is_featured: false
        }
      ])
      .returning()
      .execute();

    // Add both to cart
    const sessionId = 'mixed-cart-session';
    await db.insert(cartItemsTable)
      .values([
        {
          session_id: sessionId,
          jewelry_item_id: jewelryItems[0].id,
          quantity: 1
        },
        {
          session_id: sessionId,
          jewelry_item_id: jewelryItems[1].id,
          quantity: 2
        }
      ])
      .execute();

    const result = await getCart(sessionId);

    expect(result).toHaveLength(2);

    // Verify different categories are handled correctly
    const categories = result.map(item => item.jewelry_item.category);
    expect(categories).toContain('cufflinks');
    expect(categories).toContain('rings');

    // Verify price conversions work for different price formats
    const prices = result.map(item => item.jewelry_item.price);
    expect(prices).toContain(899.99);
    expect(prices).toContain(199.00);

    // Ensure all prices are numbers
    result.forEach(item => {
      expect(typeof item.jewelry_item.price).toBe('number');
    });
  });
});