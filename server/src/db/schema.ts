import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const jewelryCategoryEnum = pgEnum('jewelry_category', ['rings', 'earrings', 'necklaces', 'cufflinks']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

// Jewelry items table
export const jewelryItemsTable = pgTable('jewelry_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  materials: text('materials').notNull(), // Comma-separated list
  category: jewelryCategoryEnum('category').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Price in dollars with cents
  image_url: text('image_url'), // Nullable by default
  stock_quantity: integer('stock_quantity').notNull(),
  is_featured: boolean('is_featured').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Admin users table
export const adminUsersTable = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Cart items table (for guest sessions)
export const cartItemsTable = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  session_id: text('session_id').notNull(), // For tracking guest carts
  jewelry_item_id: integer('jewelry_item_id').notNull(),
  quantity: integer('quantity').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  session_id: text('session_id').notNull(),
  customer_name: text('customer_name').notNull(),
  customer_email: text('customer_email').notNull(),
  customer_phone: text('customer_phone'), // Nullable
  shipping_address: text('shipping_address').notNull(),
  billing_address: text('billing_address'), // Nullable
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  notes: text('notes'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull(),
  jewelry_item_id: integer('jewelry_item_id').notNull(),
  quantity: integer('quantity').notNull(),
  price_at_time: numeric('price_at_time', { precision: 10, scale: 2 }).notNull(), // Price when order was placed
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const jewelryItemsRelations = relations(jewelryItemsTable, ({ many }) => ({
  cartItems: many(cartItemsTable),
  orderItems: many(orderItemsTable),
}));

export const cartItemsRelations = relations(cartItemsTable, ({ one }) => ({
  jewelryItem: one(jewelryItemsTable, {
    fields: [cartItemsTable.jewelry_item_id],
    references: [jewelryItemsTable.id],
  }),
}));

export const ordersRelations = relations(ordersTable, ({ many }) => ({
  items: many(orderItemsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  jewelryItem: one(jewelryItemsTable, {
    fields: [orderItemsTable.jewelry_item_id],
    references: [jewelryItemsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type JewelryItem = typeof jewelryItemsTable.$inferSelect;
export type NewJewelryItem = typeof jewelryItemsTable.$inferInsert;
export type AdminUser = typeof adminUsersTable.$inferSelect;
export type NewAdminUser = typeof adminUsersTable.$inferInsert;
export type CartItem = typeof cartItemsTable.$inferSelect;
export type NewCartItem = typeof cartItemsTable.$inferInsert;
export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  jewelryItems: jewelryItemsTable,
  adminUsers: adminUsersTable,
  cartItems: cartItemsTable,
  orders: ordersTable,
  orderItems: orderItemsTable,
};