import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Minus, Plus, Trash2, Gem } from 'lucide-react';
import { useState } from 'react';
import type { CartWithItems } from '../../../server/src/schema';

interface CartProps {
  items: CartWithItems[];
  onUpdateQuantity: (cartItemId: number, quantity: number) => void;
  onRemoveItem: (cartItemId: number) => void;
  onProceedToCheckout: () => void;
  formatPrice: (priceInCents: number) => string;
}

export function Cart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onProceedToCheckout, 
  formatPrice 
}: CartProps) {
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  const handleQuantityChange = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdatingItems(prev => new Set(prev).add(cartItemId));
    try {
      await onUpdateQuantity(cartItemId, newQuantity);
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum: number, item: CartWithItems) => {
      return sum + (item.jewelry_item.price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 10000 ? 0 : 500; // Free shipping over $100, otherwise $5
  const tax = Math.round(subtotal * 0.08); // 8% tax
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">
            Looks like you haven't added any jewelry pieces to your cart yet. 
            Start browsing our collection to find the perfect piece for you.
          </p>
          <Button 
            size="lg"
            onClick={() => window.history.back()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Continue Shopping
          </Button>
          <p className="text-sm text-gray-400 mt-4">
            Note: This is using placeholder data. The backend handlers need to be implemented with real database integration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item: CartWithItems) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden">
                        {item.jewelry_item.image_url ? (
                          <img 
                            src={item.jewelry_item.image_url} 
                            alt={item.jewelry_item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Gem className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item Details */}
                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row justify-between mb-2">
                        <h3 className="text-lg font-semibold">{item.jewelry_item.name}</h3>
                        <p className="text-xl font-bold text-amber-600">
                          {formatPrice(item.jewelry_item.price)}
                        </p>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">{item.jewelry_item.description}</p>
                      <p className="text-sm text-gray-600 mb-4">
                        <span className="font-medium">Materials:</span> {item.jewelry_item.materials}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updatingItems.has(item.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value);
                              if (newQuantity >= 1) {
                                handleQuantityChange(item.id, newQuantity);
                              }
                            }}
                            className="w-16 text-center"
                            min="1"
                            max={item.jewelry_item.stock_quantity}
                            disabled={updatingItems.has(item.id)}
                          />
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.jewelry_item.stock_quantity || updatingItems.has(item.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          
                          <span className="text-sm text-gray-500 ml-2">
                            (Max: {item.jewelry_item.stock_quantity})
                          </span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Subtotal for this item */}
                      <div className="text-right mt-2">
                        <p className="text-sm text-gray-600">
                          Subtotal: {formatPrice(item.jewelry_item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-amber-600">{formatPrice(total)}</span>
                </div>

                {shipping === 0 && (
                  <p className="text-sm text-green-600 text-center">
                    🎉 You qualify for free shipping!
                  </p>
                )}

                <Button 
                  onClick={onProceedToCheckout} 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  size="lg"
                >
                  Proceed to Checkout
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Secure checkout with end-to-end encryption
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}