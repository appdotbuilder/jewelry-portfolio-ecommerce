import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createJewelryItemInputSchema,
  updateJewelryItemInputSchema,
  adminLoginInputSchema,
  addToCartInputSchema,
  updateCartItemInputSchema,
  createOrderInputSchema,
  jewelryCategorySchema,
  orderStatusSchema,
} from './schema';

// Import handlers
import { getJewelryItems } from './handlers/get_jewelry_items';
import { getJewelryItem } from './handlers/get_jewelry_item';
import { createJewelryItem } from './handlers/create_jewelry_item';
import { updateJewelryItem } from './handlers/update_jewelry_item';
import { deleteJewelryItem } from './handlers/delete_jewelry_item';
import { adminLogin } from './handlers/admin_login';
import { verifyAdminToken } from './handlers/verify_admin_token';
import { addToCart } from './handlers/add_to_cart';
import { getCart } from './handlers/get_cart';
import { updateCartItem } from './handlers/update_cart_item';
import { removeFromCart } from './handlers/remove_from_cart';
import { createOrder } from './handlers/create_order';
import { getOrders } from './handlers/get_orders';
import { getOrder } from './handlers/get_order';
import { updateOrderStatus } from './handlers/update_order_status';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Admin auth middleware - we'll handle auth directly in the procedures instead
const adminProcedure = publicProcedure;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Public jewelry item routes
  getJewelryItems: publicProcedure
    .input(z.object({ category: jewelryCategorySchema.optional() }).optional())
    .query(({ input }) => getJewelryItems(input?.category)),

  getJewelryItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getJewelryItem(input.id)),

  getFeaturedJewelryItems: publicProcedure
    .query(() => getJewelryItems()), // Handler should filter by is_featured

  // Admin jewelry management routes
  createJewelryItem: publicProcedure
    .input(createJewelryItemInputSchema.extend({ token: z.string() }))
    .mutation(async ({ input }) => {
      const adminUser = await verifyAdminToken(input.token);
      if (!adminUser) {
        throw new Error('Unauthorized: Invalid admin token');
      }
      const { token, ...jewelryInput } = input;
      return createJewelryItem(jewelryInput);
    }),

  updateJewelryItem: publicProcedure
    .input(updateJewelryItemInputSchema.extend({ token: z.string() }))
    .mutation(async ({ input }) => {
      const adminUser = await verifyAdminToken(input.token);
      if (!adminUser) {
        throw new Error('Unauthorized: Invalid admin token');
      }
      const { token, ...jewelryInput } = input;
      return updateJewelryItem(jewelryInput);
    }),

  deleteJewelryItem: publicProcedure
    .input(z.object({ id: z.number(), token: z.string() }))
    .mutation(async ({ input }) => {
      const adminUser = await verifyAdminToken(input.token);
      if (!adminUser) {
        throw new Error('Unauthorized: Invalid admin token');
      }
      return deleteJewelryItem(input.id);
    }),

  // Admin authentication
  adminLogin: publicProcedure
    .input(adminLoginInputSchema)
    .mutation(({ input }) => adminLogin(input)),

  verifyAdminToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(({ input }) => verifyAdminToken(input.token)),

  // Shopping cart routes
  addToCart: publicProcedure
    .input(addToCartInputSchema)
    .mutation(({ input }) => addToCart(input)),

  getCart: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => getCart(input.sessionId)),

  updateCartItem: publicProcedure
    .input(updateCartItemInputSchema)
    .mutation(({ input }) => updateCartItem(input)),

  removeFromCart: publicProcedure
    .input(z.object({ cartItemId: z.number() }))
    .mutation(({ input }) => removeFromCart(input.cartItemId)),

  // Order routes
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),

  getOrder: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getOrder(input.id)),

  // Admin order management
  getOrders: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const adminUser = await verifyAdminToken(input.token);
      if (!adminUser) {
        throw new Error('Unauthorized: Invalid admin token');
      }
      return getOrders();
    }),

  updateOrderStatus: publicProcedure
    .input(z.object({ id: z.number(), status: orderStatusSchema, token: z.string() }))
    .mutation(async ({ input }) => {
      const adminUser = await verifyAdminToken(input.token);
      if (!adminUser) {
        throw new Error('Unauthorized: Invalid admin token');
      }
      return updateOrderStatus(input.id, input.status);
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();