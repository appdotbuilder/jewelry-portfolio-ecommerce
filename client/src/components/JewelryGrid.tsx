import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gem } from 'lucide-react';
import type { JewelryItem, JewelryCategory } from '../../../server/src/schema';

interface JewelryGridProps {
  items: JewelryItem[];
  selectedCategory: JewelryCategory | 'all';
  onCategoryChange: (category: JewelryCategory | 'all') => void;
  onAddToCart: (itemId: number) => void;
  formatPrice: (priceInCents: number) => string;
}

const categoryLabels = {
  all: 'All Items',
  rings: 'Rings',
  earrings: 'Earrings',
  necklaces: 'Necklaces',
  cufflinks: 'Cufflinks'
};

export function JewelryGrid({ 
  items, 
  selectedCategory, 
  onCategoryChange, 
  onAddToCart, 
  formatPrice 
}: JewelryGridProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Our Collection</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore our exquisite range of handcrafted jewelry pieces, each meticulously designed to capture elegance and sophistication.
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex justify-center mb-8">
        <Tabs value={selectedCategory} onValueChange={(value) => onCategoryChange(value as JewelryCategory | 'all')}>
          <TabsList className="grid grid-cols-5 w-full max-w-md">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Gem className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-gray-600">No items found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {selectedCategory === 'all' 
              ? 'No jewelry items are currently available in our collection.'
              : `No ${categoryLabels[selectedCategory].toLowerCase()} are currently available.`
            }
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Note: This is using placeholder data. The backend handlers need to be implemented with real database integration.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item: JewelryItem) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
                {/* Image */}
                <div className="aspect-square relative overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Gem className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {item.is_featured && (
                      <Badge className="bg-amber-600 text-white">Featured</Badge>
                    )}
                    {item.stock_quantity === 0 && (
                      <Badge variant="destructive">Out of Stock</Badge>
                    )}
                    {item.stock_quantity > 0 && item.stock_quantity <= 3 && (
                      <Badge variant="secondary">Low Stock</Badge>
                    )}
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                      {categoryLabels[item.category]}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{item.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-sm">
                    {item.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Materials:</span>
                      <p className="text-sm text-gray-800 line-clamp-1">{item.materials}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-amber-600">
                        {formatPrice(item.price)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Stock: {item.stock_quantity}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={() => onAddToCart(item.id)}
                    disabled={item.stock_quantity === 0}
                  >
                    {item.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Items count */}
          <div className="text-center mt-8">
            <p className="text-gray-600">
              Showing {items.length} {selectedCategory === 'all' ? 'items' : categoryLabels[selectedCategory].toLowerCase()}
            </p>
          </div>
        </>
      )}
    </div>
  );
}