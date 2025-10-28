import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CustomerOrder() {
  const { tableId } = useParams();
  const [table, setTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchTable();
    fetchMenuItems();
    fetchCategories();
  }, [tableId]);

  const fetchTable = async () => {
    try {
      const response = await axios.get(`${API}/tables/${tableId}`);
      setTable(response.data);
    } catch (error) {
      console.error('Error fetching table:', error);
      toast.error('Invalid table');
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API}/menu/items?available_only=true`);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find((c) => c.item_id === item.id);
    if (existing) {
      setCart(
        cart.map((c) => (c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      setCart([
        ...cart,
        {
          item_id: item.id,
          item_name: item.name,
          quantity: 1,
          price: item.price,
          tax: item.tax,
        },
      ]);
    }
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(
      cart
        .map((c) => (c.item_id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((c) => c.item_id !== itemId));
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      await axios.post(`${API}/orders`, {
        table_id: tableId,
        order_type: 'dine_in',
        items: cart,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
      });
      toast.success('Order placed successfully!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    }
  };

  const filteredItems =
    selectedCategory === 'all'
      ? menuItems
      : menuItems.filter((item) => item.category_id === selectedCategory);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartTax = cart.reduce((sum, item) => sum + item.tax * item.quantity, 0);
  const grandTotal = cartTotal + cartTax;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
            WaiterMan
          </h1>
          {table && (
            <p className="text-gray-600 mt-1">
              {table.table_name} - Capacity: {table.capacity}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Section */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Menu</h2>
              <div className="flex gap-2 flex-wrap">
                <Button
                  data-testid="filter-all-button"
                  onClick={() => setSelectedCategory('all')}
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  className={selectedCategory === 'all' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : ''}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    data-testid={`filter-category-${cat.id}-button`}
                    onClick={() => setSelectedCategory(cat.id)}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    className={selectedCategory === cat.id ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : ''}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="menu-item-customer-card">
                  <CardHeader>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-3">{item.description || 'Delicious item'}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-blue-600">${item.price}</span>
                      <Button
                        data-testid="add-to-cart-button"
                        onClick={() => addToCart(item)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-500 to-cyan-500"
                      >
                        <Plus size={16} className="mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Section */}
          <div>
            <Card className="border-0 shadow-xl sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart size={24} />
                  Your Cart
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8" data-testid="empty-cart-message">Cart is empty</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.item_id} className="flex justify-between items-center border-b pb-3" data-testid="cart-item">
                        <div className="flex-1">
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-sm text-gray-600">${item.price}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            data-testid="decrease-quantity-button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.item_id, -1)}
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            data-testid="increase-quantity-button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.item_id, 1)}
                          >
                            <Plus size={14} />
                          </Button>
                          <Button
                            data-testid="remove-from-cart-button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.item_id)}
                          >
                            <Trash2 size={14} className="text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>${cartTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span data-testid="cart-grand-total">${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4">
                      <div>
                        <Label htmlFor="customer_name">Name (Optional)</Label>
                        <Input
                          id="customer_name"
                          data-testid="customer-name-input"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customer_phone">Phone (Optional)</Label>
                        <Input
                          id="customer_phone"
                          data-testid="customer-phone-input"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Your phone"
                        />
                      </div>
                    </div>

                    <Button
                      data-testid="place-order-button"
                      onClick={placeOrder}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-6 text-lg"
                    >
                      Place Order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}