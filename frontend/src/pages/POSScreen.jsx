import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Trash2, ShoppingCart, DollarSign, Printer, Save, Send, Search, Bell, User, X, QrCode, Edit2, AlertCircle, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [serverName, setServerName] = useState('Admin User');
  const [orderTime, setOrderTime] = useState(new Date());
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedItemForNote, setSelectedItemForNote] = useState(null);
  const [itemNote, setItemNote] = useState('');

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
        return 'bg-green-500 text-white border-green-600';
      case 'occupied':
        return 'bg-yellow-500 text-black border-yellow-600';
      case 'reserved':
        return 'bg-red-500 text-white border-red-600';
      default:
        return 'bg-gray-400 text-white border-gray-500';
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
        tax: item.tax || 0,
        notes: ''
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

  const openNoteDialog = (item) => {
    setSelectedItemForNote(item);
    setItemNote(item.notes || '');
    setNoteDialogOpen(true);
  };

  const saveNote = () => {
    setCart(cart.map((c) => 
      c.item_id === selectedItemForNote.item_id ? { ...c, notes: itemNote } : c
    ));
    setNoteDialogOpen(false);
    setItemNote('');
    toast.success('Note added');
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
      resetOrder();
      fetchTables();
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    }
  };

  const resetOrder = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedTable(null);
    setDiscount(0);
    setOrderTime(new Date());
  };

  const handleKOT = () => {
    toast.success('KOT sent to kitchen');
  };

  const handlePayment = () => {
    setPaymentOpen(true);
  };

  const processPayment = async (paymentMethod) => {
    await handlePlaceOrder();
    toast.success(`Payment processed via ${paymentMethod}`);
    setPaymentOpen(false);
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const { subtotal, tax, discountAmount, total } = calculateTotals();

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">WaiterMan POS</h1>
          <select className="bg-white/20 text-white px-3 py-1 rounded border border-white/30 text-sm">
            <option>Main Branch</option>
            <option>Branch 2</option>
          </select>
          <div className="text-sm">{new Date().toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <Bell size={18} />
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 flex items-center gap-2">
            <User size={18} />
            <span className="text-sm">{serverName}</span>
          </Button>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            size="sm"
            className="text-white border-white hover:bg-white hover:text-red-600"
          >
            Back to Admin
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SECTION - Tables & Order Type (25%) */}
        <div className="w-1/4 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Order Type Tabs */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-900 border-b border-gray-700">
            <Button
              variant={orderType === 'dine_in' ? 'default' : 'outline'}
              onClick={() => setOrderType('dine_in')}
              className={orderType === 'dine_in' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600'}
              data-testid="order-type-dine-in"
            >
              🪑 Dine-In
            </Button>
            <Button
              variant={orderType === 'takeaway' ? 'default' : 'outline'}
              onClick={() => setOrderType('takeaway')}
              className={orderType === 'takeaway' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600'}
              data-testid="order-type-takeaway"
            >
              📦 Takeaway
            </Button>
            <Button
              variant={orderType === 'delivery' ? 'default' : 'outline'}
              onClick={() => setOrderType('delivery')}
              className={orderType === 'delivery' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600'}
              data-testid="order-type-delivery"
            >
              🛵 Delivery
            </Button>
            <Button
              variant="outline"
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
            >
              🌐 Online
            </Button>
          </div>

          {/* Tables or Customer Info */}
          <div className="flex-1 overflow-y-auto p-3">
            {orderType === 'dine_in' ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-semibold">Select Table</h3>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs">
                    <Plus size={14} className="mr-1" /> Add
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
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
                      <CardContent className="p-3 text-center">
                        <div className="font-bold">{table.table_name}</div>
                        <div className="text-xs">{table.capacity} seats</div>
                        <div className="text-xs mt-1 capitalize">{table.status}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3 bg-gray-700 p-4 rounded">
                <h3 className="text-white font-semibold mb-3">Customer Details</h3>
                <div>
                  <label className="block text-white text-sm mb-1">Name</label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="bg-gray-800 text-white border-gray-600"
                    data-testid="customer-name-input"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm mb-1">Phone</label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone number"
                    className="bg-gray-800 text-white border-gray-600"
                    data-testid="customer-phone-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION - Menu (45%) */}
        <div className="flex-1 bg-gray-100 flex flex-col">
          {/* Search Bar */}
          <div className="p-3 bg-white border-b flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search menu items..."
                className="pl-10"
              />
            </div>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus size={18} className="mr-2" />
              Add Item
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="bg-white border-b px-3 py-2 overflow-x-auto">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className={selectedCategory === 'all' ? 'bg-red-600 hover:bg-red-700' : ''}
                size="sm"
              >
                All Items
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={selectedCategory === cat.id ? 'bg-red-600 hover:bg-red-700' : ''}
                  size="sm"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-4 gap-3">
              {filteredMenuItems.map((item) => (
                <Card key={item.id} className="cursor-pointer hover:shadow-xl transition-shadow border border-gray-200" data-testid="menu-item-card">
                  <CardContent className="p-3">
                    <div className="aspect-square bg-gray-200 rounded mb-2 flex items-center justify-center">
                      <Utensils size={32} className="text-gray-400" />
                    </div>
                    <div className="font-semibold text-sm mb-1 line-clamp-1">{item.name}</div>
                    <div className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description || 'No description'}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-red-600">
                        ${orderType === 'dine_in' ? item.pricing?.dine_in : 
                          orderType === 'takeaway' ? item.pricing?.takeaway : 
                          item.pricing?.delivery || item.price}
                      </span>
                      <Button
                        onClick={() => addToCart(item)}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 h-8 w-8 p-0"
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
        </div>

        {/* RIGHT SECTION - Order Cart (30%) */}
        <div className="w-[30%] bg-white border-l border-gray-300 flex flex-col">
          {/* Order Header */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} />
                Current Order
              </h2>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetOrder}>
                  <X size={16} />
                </Button>
              )}
            </div>
            {selectedTable && (
              <div className="text-sm text-gray-600">
                <div>Table: <span className="font-semibold">{selectedTable.table_name}</span></div>
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Server: {serverName} | Time: {orderTime.toLocaleTimeString()}
            </div>
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                <p>No items in cart</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.item_id} className="bg-gray-50 p-3 rounded border" data-testid="cart-item">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{item.item_name}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-600 italic mt-1">Note: {item.notes}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.item_id)}
                        className="h-6 w-6 p-0"
                        data-testid="remove-cart-item"
                      >
                        <Trash2 size={14} className="text-red-600" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.item_id, -1)}
                          className="h-7 w-7 p-0"
                          data-testid="decrease-quantity"
                        >
                          <Minus size={12} />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.item_id, 1)}
                          className="h-7 w-7 p-0"
                          data-testid="increase-quantity"
                        >
                          <Plus size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openNoteDialog(item)}
                          className="h-7 px-2 text-xs ml-2"
                        >
                          📝 Note
                        </Button>
                      </div>
                      <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing Summary & Actions */}
          {cart.length > 0 && (
            <div className="border-t p-4 bg-gray-50 space-y-3">
              {/* Discount */}
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium whitespace-nowrap">Discount %:</label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="h-8 text-sm"
                  data-testid="discount-input"
                />
              </div>

              {/* Billing Summary */}
              <div className="space-y-1 text-sm border-t pt-2">
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
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>TOTAL:</span>
                  <span className="text-red-600" data-testid="cart-total">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePlaceOrder()}
                  className="text-xs"
                  data-testid="save-order-button"
                >
                  <Save size={14} className="mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={handleKOT}
                  className="text-xs"
                  data-testid="print-kot-button"
                >
                  <Printer size={14} className="mr-1" />
                  KOT
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.info('Bill generated')}
                  className="text-xs"
                >
                  <DollarSign size={14} className="mr-1" />
                  Bill
                </Button>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-base font-bold"
                data-testid="payment-button"
              >
                <DollarSign size={20} className="mr-2" />
                Process Payment - ${total.toFixed(2)}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Bar */}
      <div className="bg-gray-900 text-white px-6 py-2 text-xs flex justify-between items-center border-t border-gray-700">
        <div>WaiterMan POS v1.0</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Online</span>
          </div>
          <div>Last sync: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              onClick={() => processPayment('Cash')}
              className="h-24 text-lg bg-green-600 hover:bg-green-700"
              data-testid="pay-cash"
            >
              💵 Cash
            </Button>
            <Button
              onClick={() => processPayment('Card')}
              className="h-24 text-lg bg-blue-600 hover:bg-blue-700"
              data-testid="pay-card"
            >
              💳 Card
            </Button>
            <Button
              onClick={() => processPayment('UPI')}
              className="h-24 text-lg bg-purple-600 hover:bg-purple-700"
              data-testid="pay-upi"
            >
              📱 UPI/QR
            </Button>
            <Button
              onClick={() => processPayment('Split')}
              className="h-24 text-lg bg-orange-600 hover:bg-orange-700"
              data-testid="pay-split"
            >
              🔀 Split Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note for {selectedItemForNote?.item_name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="Enter special instructions (e.g., no onions, extra spicy)"
              rows={4}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveNote} className="bg-red-600 hover:bg-red-700">Save Note</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


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
