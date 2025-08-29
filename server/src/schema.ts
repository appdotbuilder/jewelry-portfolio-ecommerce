import { z } from 'zod';

// Jewelry category enum
export const jewelryCategorySchema = z.enum(['rings', 'earrings', 'necklaces', 'cufflinks']);
export type JewelryCategory = z.infer<typeof jewelryCategorySchema>;

// Jewelry item schema
export const jewelryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  materials: z.string(), // Comma-separated list of materials
  category: jewelryCategorySchema,
  price: z.number(), // Price in cents to avoid floating point issues
  image_url: z.string().nullable(), // Optional image URL
  stock_quantity: z.number().int(),
  is_featured: z.boolean(), // For featuring items on homepage
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type JewelryItem = z.infer<typeof jewelryItemSchema>;

// Input schema for creating jewelry items
export const createJewelryItemInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  materials: z.string().min(1),
  category: jewelryCategorySchema,
  price: z.number().positive(),
  image_url: z.string().url().nullable(),
  stock_quantity: z.number().int().nonnegative(),
  is_featured: z.boolean().optional()
});

export type CreateJewelryItemInput = z.infer<typeof createJewelryItemInputSchema>;

// Input schema for updating jewelry items
export const updateJewelryItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  materials: z.string().min(1).optional(),
  category: jewelryCategorySchema.optional(),
  price: z.number().positive().optional(),
  image_url: z.string().url().nullable().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  is_featured: z.boolean().optional()
});

export type UpdateJewelryItemInput = z.infer<typeof updateJewelryItemInputSchema>;

// Admin user schema
export const adminUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type AdminUser = z.infer<typeof adminUserSchema>;

// Admin login input schema
export const adminLoginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type AdminLoginInput = z.infer<typeof adminLoginInputSchema>;

// Cart item schema
export const cartItemSchema = z.object({
  id: z.number(),
  session_id: z.string(), // For guest users
  jewelry_item_id: z.number(),
  quantity: z.number().int().positive(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CartItem = z.infer<typeof cartItemSchema>;

// Add to cart input schema
export const addToCartInputSchema = z.object({
  session_id: z.string(),
  jewelry_item_id: z.number(),
  quantity: z.number().int().positive()
});

export type AddToCartInput = z.infer<typeof addToCartInputSchema>;

// Update cart input schema
export const updateCartItemInputSchema = z.object({
  id: z.number(),
  quantity: z.number().int().positive()
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string().nullable(),
  shipping_address: z.string(),
  billing_address: z.string().nullable(),
  total_amount: z.number(), // Total in cents
  status: orderStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Order item schema
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  jewelry_item_id: z.number(),
  quantity: z.number().int().positive(),
  price_at_time: z.number(), // Price when order was placed
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Create order input schema
export const createOrderInputSchema = z.object({
  session_id: z.string(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().nullable(),
  shipping_address: z.string().min(1),
  billing_address: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

// Cart with jewelry items schema (for API responses)
export const cartWithItemsSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  quantity: z.number(),
  jewelry_item: jewelryItemSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CartWithItems = z.infer<typeof cartWithItemsSchema>;

// Order with items schema (for API responses)
export const orderWithItemsSchema = z.object({
  id: z.number(),
  session_id: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string().nullable(),
  shipping_address: z.string(),
  billing_address: z.string().nullable(),
  total_amount: z.number(),
  status: orderStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  items: z.array(z.object({
    id: z.number(),
    quantity: z.number(),
    price_at_time: z.number(),
    jewelry_item: jewelryItemSchema
  }))
});

export type OrderWithItems = z.infer<typeof orderWithItemsSchema>;