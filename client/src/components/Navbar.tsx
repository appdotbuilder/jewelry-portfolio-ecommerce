import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, ShoppingCart, User, Gem, Home, Grid3x3, LogIn, Settings } from 'lucide-react';

type Page = 'home' | 'products' | 'cart' | 'checkout' | 'admin' | 'admin-dashboard';

interface NavbarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  cartItemCount: number;
  isAdmin: boolean;
}

export function Navbar({ currentPage, onPageChange, cartItemCount, isAdmin }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'home' as Page, label: 'Home', icon: Home },
    { id: 'products' as Page, label: 'Collection', icon: Grid3x3 },
  ];

  const NavItem = ({ page, label, icon: Icon, onClick }: { 
    page: Page; 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
        currentPage === page 
          ? 'bg-amber-100 text-amber-800' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  const handleNavigation = (page: Page) => {
    onPageChange(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => handleNavigation('home')}
          >
            <Gem className="h-8 w-8 text-amber-600" />
            <span className="text-xl font-bold text-gray-900">Jewelry Portfolio</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <NavItem
                key={item.id}
                page={item.id}
                label={item.label}
                icon={item.icon}
                onClick={() => handleNavigation(item.id)}
              />
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Cart Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigation('cart')}
              className="relative"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-amber-600">
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {/* Admin Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigation(isAdmin ? 'admin-dashboard' : 'admin')}
            >
              {isAdmin ? <Settings className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </Button>

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <Gem className="h-6 w-6 text-amber-600" />
                    <span>Menu</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {navigationItems.map((item) => (
                    <NavItem
                      key={item.id}
                      page={item.id}
                      label={item.label}
                      icon={item.icon}
                      onClick={() => handleNavigation(item.id)}
                    />
                  ))}
                  <div className="border-t pt-4">
                    <button
                      onClick={() => handleNavigation('cart')}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4" />
                        <span>Cart</span>
                      </div>
                      {cartItemCount > 0 && (
                        <Badge className="bg-amber-600 text-white">
                          {cartItemCount}
                        </Badge>
                      )}
                    </button>
                    <button
                      onClick={() => handleNavigation(isAdmin ? 'admin-dashboard' : 'admin')}
                      className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 mt-2"
                    >
                      {isAdmin ? <Settings className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                      <span>{isAdmin ? 'Admin Dashboard' : 'Admin Login'}</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}