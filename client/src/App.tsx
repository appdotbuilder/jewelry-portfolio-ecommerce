import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem, Star } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { Navbar } from '@/components/Navbar';
import { JewelryGrid } from '@/components/JewelryGrid';
import { Cart } from '@/components/Cart';
import { Checkout } from '@/components/Checkout';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminDashboard } from '@/components/AdminDashboard';
import type { JewelryItem, CartWithItems, JewelryCategory } from '../../server/src/schema';

type Page = 'home' | 'products' | 'cart' | 'checkout' | 'admin' | 'admin-dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedCategory, setSelectedCategory] = useState<JewelryCategory | 'all'>('all');
  const [jewelryItems, setJewelryItems] = useState<JewelryItem[]>([]);
  const [featuredItems, setFeaturedItems] = useState<JewelryItem[]>([]);
  const [cartItems, setCartItems] = useState<CartWithItems[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Generate or get session ID
  useEffect(() => {
    let storedSessionId = localStorage.getItem('jewelry-session-id');
    if (!storedSessionId) {
      storedSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('jewelry-session-id', storedSessionId);
    }
    setSessionId(storedSessionId);
  }, []);

  // Check for stored admin token
  useEffect(() => {
    const storedToken = localStorage.getItem('admin-token');
    if (storedToken) {
      verifyToken(storedToken);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const result = await trpc.verifyAdminToken.query({ token });
      if (result) {
        setAdminToken(token);
      } else {
        localStorage.removeItem('admin-token');
        setAdminToken(null);
      }
    } catch {
      localStorage.removeItem('admin-token');
      setAdminToken(null);
    }
  };

  const loadJewelryItems = useCallback(async () => {
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const items = await trpc.getJewelryItems.query({ category });
      setJewelryItems(items);
    } catch (error) {
      console.error('Failed to load jewelry items:', error);
    }
  }, [selectedCategory]);

  const loadFeaturedItems = useCallback(async () => {
    try {
      const items = await trpc.getFeaturedJewelryItems.query();
      setFeaturedItems(items.filter((item: JewelryItem) => item.is_featured));
    } catch (error) {
      console.error('Failed to load featured items:', error);
    }
  }, []);

  const loadCart = useCallback(async () => {
    if (!sessionId) return;
    try {
      const items = await trpc.getCart.query({ sessionId });
      setCartItems(items);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (currentPage === 'home') {
      loadFeaturedItems();
    } else if (currentPage === 'products') {
      loadJewelryItems();
    } else if (currentPage === 'cart') {
      loadCart();
    }
  }, [currentPage, loadJewelryItems, loadFeaturedItems, loadCart]);

  const handleAddToCart = async (jewelryItemId: number, quantity: number = 1) => {
    if (!sessionId) return;
    try {
      await trpc.addToCart.mutate({ session_id: sessionId, jewelry_item_id: jewelryItemId, quantity });
      await loadCart();
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('admin-token', token);
    setCurrentPage('admin-dashboard');
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin-token');
    setCurrentPage('home');
  };

  const cartItemCount = cartItems.reduce((sum: number, item: CartWithItems) => sum + item.quantity, 0);

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div className="space-y-12">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-20">
              <div className="container mx-auto px-4 text-center">
                <div className="flex justify-center mb-6">
                  <Gem className="h-16 w-16 text-amber-400" />
                </div>
                <h1 className="text-5xl font-bold mb-6">Exquisite Jewelry Collection</h1>
                <p className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto">
                  Discover our handcrafted jewelry pieces, each designed with precision and passion to celebrate life's precious moments.
                </p>
                <Button 
                  size="lg" 
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => setCurrentPage('products')}
                >
                  Explore Collection
                </Button>
              </div>
            </section>

            {/* Featured Items */}
            <section className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Featured Collection</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Our carefully curated selection of exceptional pieces that showcase the finest in contemporary jewelry design.
                </p>
              </div>
              
              {featuredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Gem className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No featured items available at the moment.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Note: This is using placeholder data. The backend handlers need to be implemented with real database integration.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredItems.map((item: JewelryItem) => (
                    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {item.image_url ? (
                        <div className="aspect-square relative">
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <Badge className="absolute top-2 right-2 bg-amber-600">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          <Gem className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Materials:</span> {item.materials}
                        </p>
                        <p className="text-2xl font-bold text-amber-600">{formatPrice(item.price)}</p>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full"
                          onClick={() => handleAddToCart(item.id)}
                          disabled={item.stock_quantity === 0}
                        >
                          {item.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        );

      case 'products':
        return (
          <JewelryGrid
            items={jewelryItems}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onAddToCart={handleAddToCart}
            formatPrice={formatPrice}
          />
        );

      case 'cart':
        return (
          <Cart
            items={cartItems}
            onUpdateQuantity={async (id: number, quantity: number) => {
              try {
                await trpc.updateCartItem.mutate({ id, quantity });
                await loadCart();
              } catch (error) {
                console.error('Failed to update cart item:', error);
              }
            }}
            onRemoveItem={async (id: number) => {
              try {
                await trpc.removeFromCart.mutate({ cartItemId: id });
                await loadCart();
              } catch (error) {
                console.error('Failed to remove cart item:', error);
              }
            }}
            onProceedToCheckout={() => setCurrentPage('checkout')}
            formatPrice={formatPrice}
          />
        );

      case 'checkout':
        return (
          <Checkout
            cartItems={cartItems}
            sessionId={sessionId}
            onOrderComplete={() => {
              setCartItems([]);
              setCurrentPage('home');
            }}
            formatPrice={formatPrice}
          />
        );

      case 'admin':
        return (
          <AdminLogin
            onLogin={handleAdminLogin}
            onCancel={() => setCurrentPage('home')}
          />
        );

      case 'admin-dashboard':
        return adminToken ? (
          <AdminDashboard
            token={adminToken}
            onLogout={handleAdminLogout}
            formatPrice={formatPrice}
          />
        ) : (
          <AdminLogin
            onLogin={handleAdminLogin}
            onCancel={() => setCurrentPage('home')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        cartItemCount={cartItemCount}
        isAdmin={!!adminToken}
      />
      
      <main className="pt-16">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Gem className="h-6 w-6 text-amber-400 mr-2" />
                <span className="text-xl font-bold">Jewelry Portfolio</span>
              </div>
              <p className="text-gray-400">
                Crafting exceptional jewelry pieces that celebrate life's most precious moments.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Categories</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Rings</li>
                <li>Earrings</li>
                <li>Necklaces</li>
                <li>Cufflinks</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-400">
                Email: info@jewelryportfolio.com<br />
                Phone: (555) 123-4567
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Jewelry Portfolio. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;