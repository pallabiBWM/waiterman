import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Trash2, ShoppingCart, DollarSign, Printer, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function POSScreen() {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderType, setOrderType] = useState('dine_in');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    fetchTables();
    fetchMenuItems();
    fetchCategories();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`, { headers: getAuthHeader() });
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API}/menu/items?available_only=true`, { headers: getAuthHeader() });
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, { headers: getAuthHeader() });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 border-green-400 text-green-800';
      case 'occupied':
        return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'reserved':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const addToCart = (item) => {
    const price = orderType === 'dine_in' ? item.pricing?.dine_in : 
                  orderType === 'takeaway' ? item.pricing?.takeaway : 
                  item.pricing?.delivery || item.price;

    const existing = cart.find((c) => c.item_id === item.id);
    if (existing) {
      setCart(cart.map((c) => 
        c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        price: price,
        tax: item.tax || 0
      }]);
    }
    toast.success(`${item.name} added`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map((c) => 
      c.item_id === itemId ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c
    ));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((c) => c.item_id !== itemId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = cart.reduce((sum, item) => sum + (item.tax * item.quantity), 0);
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal + tax - discountAmount;
    return { subtotal, tax, discountAmount, total };
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (orderType === 'dine_in' && !selectedTable) {
      toast.error('Please select a table');
      return;
    }

    try {
      await axios.post(`${API}/orders`, {
        table_id: orderType === 'dine_in' ? selectedTable?.id : null,
        order_type: orderType,
        items: cart,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined
      }, { headers: getAuthHeader() });
      
      toast.success('Order placed successfully!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedTable(null);
      setDiscount(0);
      fetchTables();
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    }
  };

  const handlePayment = () => {
    setPaymentOpen(true);
  };

  const processPayment = async (paymentMethod) => {
    await handlePlaceOrder();
    toast.success(`Payment processed via ${paymentMethod}`);
    setPaymentOpen(false);
  };

  const filteredMenuItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter((item) => item.category_id === selectedCategory);

  const { subtotal, tax, discountAmount, total } = calculateTotals();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 z-10 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">WaiterMan POS</h1>
            <div className="flex gap-2">
              <Button
                variant={orderType === 'dine_in' ? 'default' : 'outline'}
                onClick={() => setOrderType('dine_in')}
                className={orderType === 'dine_in' ? 'bg-white text-red-600' : 'text-white border-white'}
                data-testid="order-type-dine-in"
              >
                Dine-In
              </Button>
              <Button
                variant={orderType === 'takeaway' ? 'default' : 'outline'}
                onClick={() => setOrderType('takeaway')}
                className={orderType === 'takeaway' ? 'bg-white text-red-600' : 'text-white border-white'}
                data-testid="order-type-takeaway"
              >
                Takeaway
              </Button>
              <Button
                variant={orderType === 'delivery' ? 'default' : 'outline'}
                onClick={() => setOrderType('delivery')}
                className={orderType === 'delivery' ? 'bg-white text-red-600' : 'text-white border-white'}
                data-testid="order-type-delivery"
              >
                Delivery
              </Button>
            </div>
          </div>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            className="text-white border-white hover:bg-white hover:text-red-600"
          >
            Back to Admin
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 mt-20">
        {/* Left Panel - Tables/Orders */}
        <div className="w-1/3 bg-white border-r overflow-y-auto p-4">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            {orderType === 'dine_in' ? 'Select Table' : 'Active Orders'}
          </h2>

          {orderType === 'dine_in' && (
            <div className="grid grid-cols-2 gap-3">
              {tables.map((table) => (
                <Card
                  key={table.id}
                  className={`cursor-pointer border-2 transition-all ${
                    selectedTable?.id === table.id 
                      ? 'ring-4 ring-red-500 border-red-500' 
                      : getTableStatusColor(table.status)
                  }`}
                  onClick={() => setSelectedTable(table)}
                  data-testid="table-card"
                >
                  <CardContent className="p-4 text-center">
                    <div className="font-bold text-lg">{table.table_name}</div>
                    <div className="text-sm">{table.capacity} seats</div>
                    <div className="text-xs mt-1 capitalize">{table.status}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {orderType !== 'dine_in' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter name"
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone"
                  data-testid="customer-phone-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Center Panel - Menu */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              className={selectedCategory === 'all' ? 'bg-red-600' : ''}
            >
              All Items
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? 'bg-red-600' : ''}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {filteredMenuItems.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-lg transition-shadow" data-testid="menu-item-card">
                <CardContent className="p-4">
                  <div className="font-semibold text-lg mb-2">{item.name}</div>
                  <div className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-red-600">
                      ${orderType === 'dine_in' ? item.pricing?.dine_in : 
                        orderType === 'takeaway' ? item.pricing?.takeaway : 
                        item.pricing?.delivery || item.price}
                    </span>
                    <Button
                      onClick={() => addToCart(item)}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="add-to-cart-button"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart />
              Current Order
            </h2>
            {selectedTable && (
              <div className="text-sm text-gray-600 mt-1">
                Table: {selectedTable.table_name}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No items in cart</div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.item_id} className="bg-gray-50 p-3 rounded-lg" data-testid="cart-item">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{item.item_name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.item_id)}
                        data-testid="remove-cart-item"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.item_id, -1)}
                          data-testid="decrease-quantity"
                        >
                          <Minus size={14} />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.item_id, 1)}
                          data-testid="increase-quantity"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Discount %</label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                  placeholder="0"
                  data-testid="discount-input"
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount ({discount}%):</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-red-600" data-testid="cart-total">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePlaceOrder()}
                  className="w-full"
                  data-testid="save-order-button"
                >
                  <Save size={16} className="mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.info('KOT sent to kitchen')}
                  className="w-full"
                  data-testid="print-kot-button"
                >
                  <Printer size={16} className="mr-2" />
                  KOT
                </Button>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold"
                data-testid="payment-button"
              >
                <DollarSign size={20} className="mr-2" />
                Process Payment
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              onClick={() => processPayment('Cash')}
              className="h-24 text-lg"
              data-testid="pay-cash"
            >
              Cash
            </Button>
            <Button
              onClick={() => processPayment('Card')}
              className="h-24 text-lg"
              data-testid="pay-card"
            >
              Card
            </Button>
            <Button
              onClick={() => processPayment('UPI')}
              className="h-24 text-lg"
              data-testid="pay-upi"
            >
              UPI/QR
            </Button>
            <Button
              onClick={() => processPayment('Split')}
              className="h-24 text-lg"
              data-testid="pay-split"
            >
              Split Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
