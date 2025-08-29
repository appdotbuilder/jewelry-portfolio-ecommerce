import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Settings, 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  LogOut, 
  ShoppingBag, 
  Gem,
  Star
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  JewelryItem, 
  CreateJewelryItemInput, 
  UpdateJewelryItemInput, 
  OrderWithItems,
  JewelryCategory,
  OrderStatus
} from '../../../server/src/schema';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  formatPrice: (priceInCents: number) => string;
}

export function AdminDashboard({ token, onLogout, formatPrice }: AdminDashboardProps) {
  const [jewelryItems, setJewelryItems] = useState<JewelryItem[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<JewelryItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [newItemForm, setNewItemForm] = useState<CreateJewelryItemInput>({
    name: '',
    description: '',
    materials: '',
    category: 'rings',
    price: 0,
    image_url: null,
    stock_quantity: 0,
    is_featured: false
  });

  const loadJewelryItems = useCallback(async () => {
    try {
      const items = await trpc.getJewelryItems.query();
      setJewelryItems(items);
    } catch (error) {
      console.error('Failed to load jewelry items:', error);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const orderList = await trpc.getOrders.query({ token });
      setOrders(orderList);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  }, [token]);

  useEffect(() => {
    loadJewelryItems();
    loadOrders();
  }, [loadJewelryItems, loadOrders]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createJewelryItem.mutate({ ...newItemForm, token });
      await loadJewelryItems();
      setNewItemForm({
        name: '',
        description: '',
        materials: '',
        category: 'rings',
        price: 0,
        image_url: null,
        stock_quantity: 0,
        is_featured: false
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setIsLoading(true);
    
    try {
      const updateData: UpdateJewelryItemInput = {
        id: editingItem.id,
        name: editingItem.name,
        description: editingItem.description,
        materials: editingItem.materials,
        category: editingItem.category,
        price: editingItem.price,
        image_url: editingItem.image_url,
        stock_quantity: editingItem.stock_quantity,
        is_featured: editingItem.is_featured
      };
      
      await trpc.updateJewelryItem.mutate({ ...updateData, token });
      await loadJewelryItems();
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await trpc.deleteJewelryItem.mutate({ id, token });
      await loadJewelryItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      await trpc.updateOrderStatus.mutate({ id: orderId, status, token });
      await loadOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const updateNewItemForm = (field: keyof CreateJewelryItemInput, value: string | number | boolean | null) => {
    setNewItemForm((prev: CreateJewelryItemInput) => ({ ...prev, [field]: value }));
  };

  const updateEditingItem = (field: keyof JewelryItem, value: string | number | boolean | null) => {
    if (!editingItem) return;
    setEditingItem((prev: JewelryItem | null) => prev ? ({ ...prev, [field]: value }) : null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600">Manage your jewelry collection and orders</p>
          </div>
        </div>
        <Button onClick={onLogout} variant="outline">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="jewelry" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jewelry" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Jewelry Items ({jewelryItems.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Orders ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* Jewelry Items Tab */}
        <TabsContent value="jewelry" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Jewelry Items</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Jewelry Item</DialogTitle>
                  <DialogDescription>
                    Create a new jewelry piece for your collection
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateItem} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-name">Name</Label>
                      <Input
                        id="new-name"
                        value={newItemForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          updateNewItemForm('name', e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-category">Category</Label>
                      <Select value={newItemForm.category} onValueChange={(value: JewelryCategory) => updateNewItemForm('category', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rings">Rings</SelectItem>
                          <SelectItem value="earrings">Earrings</SelectItem>
                          <SelectItem value="necklaces">Necklaces</SelectItem>
                          <SelectItem value="cufflinks">Cufflinks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-description">Description</Label>
                    <Textarea
                      id="new-description"
                      value={newItemForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                        updateNewItemForm('description', e.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-materials">Materials</Label>
                    <Input
                      id="new-materials"
                      value={newItemForm.materials}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        updateNewItemForm('materials', e.target.value)
                      }
                      placeholder="Gold, Silver, Diamond, etc."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-price">Price (in cents)</Label>
                      <Input
                        id="new-price"
                        type="number"
                        value={newItemForm.price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          updateNewItemForm('price', parseInt(e.target.value) || 0)
                        }
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-stock">Stock Quantity</Label>
                      <Input
                        id="new-stock"
                        type="number"
                        value={newItemForm.stock_quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          updateNewItemForm('stock_quantity', parseInt(e.target.value) || 0)
                        }
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-image">Image URL (Optional)</Label>
                    <Input
                      id="new-image"
                      type="url"
                      value={newItemForm.image_url || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        updateNewItemForm('image_url', e.target.value || null)
                      }
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="new-featured"
                      checked={newItemForm.is_featured}
                      onCheckedChange={(checked: boolean) => updateNewItemForm('is_featured', checked)}
                    />
                    <Label htmlFor="new-featured">Featured Item</Label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? 'Creating...' : 'Create Item'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {jewelryItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gem className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No jewelry items yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  Start building your collection by adding your first jewelry piece.
                </p>
                <p className="text-sm text-gray-400 text-center">
                  Note: This is using placeholder data. The backend handlers need to be implemented with real database integration.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jewelryItems.map((item: JewelryItem) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-square relative">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Gem className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {item.is_featured && (
                        <Badge className="bg-amber-600">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {item.stock_quantity === 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : item.stock_quantity <= 3 ? (
                        <Badge variant="secondary">Low Stock</Badge>
                      ) : null}
                    </div>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {item.name}
                      <Badge variant="outline">{item.category}</Badge>
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Materials:</strong> {item.materials}</p>
                      <p className="text-sm"><strong>Price:</strong> {formatPrice(item.price)}</p>
                      <p className="text-sm"><strong>Stock:</strong> {item.stock_quantity}</p>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Jewelry Item</DialogTitle>
                          <DialogDescription>
                            Update the details for {item.name}
                          </DialogDescription>
                        </DialogHeader>
                        {editingItem && (
                          <form onSubmit={handleUpdateItem} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                  id="edit-name"
                                  value={editingItem.name}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                    updateEditingItem('name', e.target.value)
                                  }
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-category">Category</Label>
                                <Select value={editingItem.category} onValueChange={(value: JewelryCategory) => updateEditingItem('category', value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="rings">Rings</SelectItem>
                                    <SelectItem value="earrings">Earrings</SelectItem>
                                    <SelectItem value="necklaces">Necklaces</SelectItem>
                                    <SelectItem value="cufflinks">Cufflinks</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                value={editingItem.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                                  updateEditingItem('description', e.target.value)
                                }
                                required
                              />
                            </div>

                            <div>
                              <Label htmlFor="edit-materials">Materials</Label>
                              <Input
                                id="edit-materials"
                                value={editingItem.materials}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                  updateEditingItem('materials', e.target.value)
                                }
                                required
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-price">Price (in cents)</Label>
                                <Input
                                  id="edit-price"
                                  type="number"
                                  value={editingItem.price}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                    updateEditingItem('price', parseInt(e.target.value) || 0)
                                  }
                                  min="0"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-stock">Stock Quantity</Label>
                                <Input
                                  id="edit-stock"
                                  type="number"
                                  value={editingItem.stock_quantity}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                    updateEditingItem('stock_quantity', parseInt(e.target.value) || 0)
                                  }
                                  min="0"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="edit-image">Image URL</Label>
                              <Input
                                id="edit-image"
                                type="url"
                                value={editingItem.image_url || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                  updateEditingItem('image_url', e.target.value || null)
                                }
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Switch
                                id="edit-featured"
                                checked={editingItem.is_featured}
                                onCheckedChange={(checked: boolean) => updateEditingItem('is_featured', checked)}
                              />
                              <Label htmlFor="edit-featured">Featured Item</Label>
                            </div>

                            <div className="flex gap-3 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingItem(null)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isLoading} className="flex-1">
                                {isLoading ? 'Updating...' : 'Update Item'}
                              </Button>
                            </div>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Item</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteItem(item.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <h2 className="text-2xl font-semibold">Orders</h2>
          
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                <p className="text-gray-600 text-center">
                  Orders will appear here once customers start making purchases.
                </p>
                <p className="text-sm text-gray-400 text-center mt-2">
                  Note: This is using placeholder data. The backend handlers need to be implemented with real database integration.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order: OrderWithItems) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Order #{order.id}</CardTitle>
                        <CardDescription>
                          {order.customer_name} • {order.customer_email}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-600">
                          {formatPrice(order.total_amount)}
                        </p>
                        <Badge 
                          variant={
                            order.status === 'delivered' ? 'default' :
                            order.status === 'shipped' ? 'secondary' :
                            order.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }
                        >
                          {order.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-semibold mb-2">Shipping Address</h4>
                        <p className="text-sm text-gray-600">{order.shipping_address}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Order Items</h4>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <p key={item.id} className="text-sm text-gray-600">
                              {item.quantity}x {item.jewelry_item.name} - {formatPrice(item.price_at_time)}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {order.notes && (
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Notes</h4>
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    )}
                    
                    <Separator className="my-4" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Select 
                          value={order.status} 
                          onValueChange={(status: OrderStatus) => handleUpdateOrderStatus(order.id, status)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-gray-500">
                        Ordered: {order.created_at.toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}