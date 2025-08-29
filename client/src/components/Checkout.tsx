import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/utils/trpc';
import { CreditCard, Lock, Truck, CheckCircle } from 'lucide-react';
import type { CartWithItems, CreateOrderInput } from '../../../server/src/schema';

interface CheckoutProps {
  cartItems: CartWithItems[];
  sessionId: string;
  onOrderComplete: () => void;
  formatPrice: (priceInCents: number) => string;
}

export function Checkout({ cartItems, sessionId, onOrderComplete, formatPrice }: CheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  
  const [formData, setFormData] = useState<CreateOrderInput>({
    session_id: sessionId,
    customer_name: '',
    customer_email: '',
    customer_phone: null,
    shipping_address: '',
    billing_address: null,
    notes: null
  });

  const calculateSubtotal = () => {
    return cartItems.reduce((sum: number, item: CartWithItems) => {
      return sum + (item.jewelry_item.price * item.quantity);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 10000 ? 0 : 500; // Free shipping over $100
  const tax = Math.round(subtotal * 0.08); // 8% tax
  const total = subtotal + shipping + tax;

  const handleInputChange = (field: keyof CreateOrderInput, value: string | null) => {
    setFormData((prev: CreateOrderInput) => ({ ...prev, [field]: value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const orderData = {
        ...formData,
        billing_address: sameAsBilling ? null : formData.billing_address
      };
      
      const order = await trpc.createOrder.mutate(orderData);
      if (order) {
        setOrderId(order.id);
        setOrderComplete(true);
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Order Confirmed!</h1>
          <p className="text-gray-600 mb-2">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
          <p className="text-lg font-semibold mb-8">
            Order ID: #{orderId}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4">What's Next?</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>📧 You'll receive an order confirmation email shortly</p>
              <p>📦 Your jewelry will be carefully packaged and shipped</p>
              <p>🚚 Estimated delivery: 3-5 business days</p>
              <p>📱 You'll receive tracking information when your order ships</p>
            </div>
          </div>

          <Button 
            onClick={onOrderComplete}
            className="bg-amber-600 hover:bg-amber-700"
            size="lg"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Your cart is empty. Please add items before checking out.</p>
          <Button onClick={onOrderComplete} className="mt-4">
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_name">Full Name *</Label>
                      <Input
                        id="customer_name"
                        value={formData.customer_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleInputChange('customer_name', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer_email">Email Address *</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleInputChange('customer_email', e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customer_phone">Phone Number (Optional)</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleInputChange('customer_phone', e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="shipping_address">Full Address *</Label>
                    <Textarea
                      id="shipping_address"
                      value={formData.shipping_address}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                        handleInputChange('shipping_address', e.target.value)
                      }
                      placeholder="Street address, city, state, ZIP code, country"
                      rows={4}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="same_as_shipping"
                      checked={sameAsBilling}
                      onCheckedChange={(checked: boolean) => setSameAsBilling(checked)}
                    />
                    <Label htmlFor="same_as_shipping">Same as shipping address</Label>
                  </div>
                  
                  {!sameAsBilling && (
                    <div>
                      <Label htmlFor="billing_address">Billing Address *</Label>
                      <Textarea
                        id="billing_address"
                        value={formData.billing_address || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                          handleInputChange('billing_address', e.target.value)
                        }
                        placeholder="Street address, city, state, ZIP code, country"
                        rows={4}
                        required={!sameAsBilling}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Notes (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                      handleInputChange('notes', e.target.value)
                    }
                    placeholder="Special delivery instructions, gift message, etc."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Items */}
                  <div className="space-y-3">
                    {cartItems.map((item: CartWithItems) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">{item.jewelry_item.name}</p>
                          <p className="text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">
                          {formatPrice(item.jewelry_item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
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
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-amber-600">{formatPrice(total)}</span>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : `Place Order ${formatPrice(total)}`}
                  </Button>

                  <div className="text-xs text-gray-500 text-center space-y-1">
                    <p className="flex items-center justify-center gap-1">
                      <Lock className="h-3 w-3" />
                      Secure checkout
                    </p>
                    <p>Note: This is a demo. No real payment is processed.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}