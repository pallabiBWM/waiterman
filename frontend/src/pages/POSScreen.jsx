import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Trash2, ShoppingCart, DollarSign, Printer, Save, Send, Search, Bell, User, X, Utensils, Edit2, QrCode, Filter, Clock, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQrTable, setSelectedQrTable] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [serverName, setServerName] = useState('Admin User');
  const [orderTime, setOrderTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedItemForNote, setSelectedItemForNote] = useState(null);
  const [itemNote, setItemNote] = useState('');

  useEffect(() => {
    fetchTables();
    fetchMenuItems();
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((new Date() - orderTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [orderTime]);

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
    const discountAmt = discountType === 'percentage' ? (subtotal * discount) / 100 : discountAmount;
    const total = subtotal + tax - discountAmt;
    return { subtotal, tax, discountAmt, total };
  };

  const applyDiscount = () => {
    setDiscountOpen(false);
    toast.success('Discount applied');
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
    setDiscountAmount(0);
    setOrderTime(new Date());
    setElapsedTime(0);
  };

  const handleKOT = () => {
    toast.success('KOT sent to kitchen');
  };

  const handleGenerateBill = () => {
    toast.success('Bill generated');
  };

  const handlePayment = () => {
    setPaymentOpen(true);
  };

  const processPayment = async (paymentMethod) => {
    await handlePlaceOrder();
    toast.success(`Payment of $${calculateTotals().total.toFixed(2)} processed via ${paymentMethod}`);
    setPaymentOpen(false);
  };

  const showQR = (table) => {
    setSelectedQrTable(table);
    setQrDialogOpen(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const { subtotal, tax, discountAmt, total } = calculateTotals();

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">WaiterMan POS</h1>
          <select className="bg-white/20 text-white px-3 py-1 rounded border border-white/30 text-sm cursor-pointer">
            <option>Main Branch</option>
            <option>Branch 2</option>
          </select>
          <div className="text-sm">{new Date().toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">3</span>
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <User size={18} />
            <select 
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="bg-white/20 text-white px-2 py-1 rounded border border-white/30 cursor-pointer"
            >
              <option>Admin User</option>
              <option>Server 1</option>
              <option>Server 2</option>
            </select>
          </div>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
            size="sm"
            className="text-white border-white hover:bg-white hover:text-red-600"
          >
            Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT - Tables (25%) */}
        <div className="w-1/4 bg-gray-900 border-r border-gray-700 flex flex-col">
          {/* Order Type Tabs */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-black border-b border-gray-700">
            {[
              { type: 'dine_in', label: '🪑 Dine-In' },
              { type: 'takeaway', label: '📦 Takeaway' },
              { type: 'delivery', label: '🛵 Delivery' },
              { type: 'online', label: '🌐 Online' }
            ].map(({ type, label }) => (
              <Button
                key={type}
                variant={orderType === type ? 'default' : 'outline'}
                onClick={() => setOrderType(type)}
                className={orderType === type ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}
                size="sm"
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Action Buttons for Tables */}
          {orderType === 'dine_in' && (
            <div className="flex gap-2 p-3 bg-gray-900 border-b border-gray-700">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs flex-1">
                <Plus size={14} className="mr-1" /> Add
              </Button>
              <Button size="sm" variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 text-xs">
                <Edit2 size={14} />
              </Button>
              <Button size="sm" variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 text-xs">
                <Trash2 size={14} />
              </Button>
            </div>
          )}

          {/* Tables or Customer Info */}
          <div className="flex-1 overflow-y-auto p-3">
            {orderType === 'dine_in' ? (
              <div className="grid grid-cols-2 gap-2">
                {tables.map((table) => (
                  <Card
                    key={table.id}
                    className={`cursor-pointer border-2 transition-all ${
                      selectedTable?.id === table.id ? 'ring-4 ring-red-500 border-red-500' : getTableStatusColor(table.status)
                    }`}
                    onClick={() => setSelectedTable(table)}
                  >
                    <CardContent className="p-3 text-center relative">
                      <div className="font-bold text-sm">{table.table_name}</div>
                      <div className="text-xs mt-1">{table.capacity} seats</div>
                      <div className="text-xs mt-1 capitalize font-semibold">{table.status}</div>
                      {table.status === 'occupied' && (
                        <div className="text-xs mt-1">$45.50</div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          showQR(table);
                        }}
                      >
                        <QrCode size={14} />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                  <h3 className="text-white font-semibold mb-3 text-sm">Customer Details</h3>
                  <div className="space-y-2">
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      className="bg-gray-900 text-white border-gray-700"
                    />
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone number"
                      className="bg-gray-900 text-white border-gray-700"
                    />
                  </div>
                </div>
                {/* Active Orders List */}
                <div className="bg-gray-800 p-3 rounded border border-gray-700">
                  <h3 className="text-white font-semibold mb-2 text-sm">Active Orders</h3>
                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="text-center py-2">No active orders</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE - Menu (45%) */}
        <div className="flex-1 bg-gray-100 flex flex-col">
          {/* Search and Filters */}
          <div className="p-3 bg-white border-b flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Search by item name or category..." 
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter size={16} />
              Filter
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 gap-2" size="sm">
              <Plus size={16} />
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
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="grid grid-cols-4 gap-3">
              {filteredMenuItems.map((item) => (
                <Card key={item.id} className="hover:shadow-xl transition border border-gray-200 relative">
                  <CardContent className="p-3">
                    {/* Availability Indicator */}
                    <div className="absolute top-2 right-2">
                      <div className={`w-2 h-2 rounded-full ${item.availability ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="aspect-square bg-gray-200 rounded mb-2 flex items-center justify-center">
                      <Utensils size={32} className="text-gray-400" />
                    </div>
                    <div className="font-semibold text-sm mb-1 line-clamp-1">{item.name}</div>
                    <div className="text-xs text-gray-600 mb-2 line-clamp-1">{item.description || 'Delicious item'}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-red-600">
                        ${orderType === 'dine_in' ? item.pricing?.dine_in : orderType === 'takeaway' ? item.pricing?.takeaway : item.pricing?.delivery || item.price}
                      </span>
                      <Button 
                        onClick={() => addToCart(item)} 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700 h-8 w-8 p-0"
                        disabled={!item.availability}
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

        {/* RIGHT - Cart (30%) */}
        <div className="w-[30%] bg-white border-l border-gray-300 flex flex-col">
          {/* Order Header */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} />
                {orderType === 'dine_in' ? 'Dine-In Order' : orderType === 'takeaway' ? 'Takeaway Order' : 'Delivery Order'}
              </h2>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetOrder}>
                  <X size={16} />
                </Button>
              )}
            </div>
            {selectedTable && (
              <div className="text-sm font-semibold text-gray-700">
                Table: {selectedTable.table_name}
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <div className="flex items-center gap-1">
                <User size={12} />
                Server: {serverName}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                Time: {formatTime(elapsedTime)}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No items in cart</p>
                <p className="text-xs mt-1">Start adding items from menu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.item_id} className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{item.item_name}</div>
                        {item.notes && (
                          <div className="text-xs text-gray-600 italic mt-1 bg-yellow-50 p-1 rounded">
                            📝 {item.notes}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.item_id)} className="h-6 w-6 p-0">
                        <Trash2 size={14} className="text-red-600" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => updateQuantity(item.item_id, -1)} className="h-7 w-7 p-0">
                          <Minus size={12} />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <Button variant="outline" size="sm" onClick={() => updateQuantity(item.item_id, 1)} className="h-7 w-7 p-0">
                          <Plus size={12} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openNoteDialog(item)} className="h-7 px-2 text-xs ml-1">
                          📝
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
              {/* Discount & Promo Buttons */}
              <div className="flex gap-2">
                <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 text-xs">
                      Apply Discount
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Apply Discount</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Discount Type</Label>
                        <select 
                          className="w-full p-2 border rounded"
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value)}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount ($)</option>
                        </select>
                      </div>
                      {discountType === 'percentage' ? (
                        <div>
                          <Label>Discount Percentage</Label>
                          <Input
                            type="number"
                            value={discount}
                            onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label>Discount Amount ($)</Label>
                          <Input
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                            placeholder="0.00"
                          />
                        </div>
                      )}
                      <Button onClick={applyDiscount} className="w-full bg-red-600">Apply</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="flex-1 text-xs">
                  Add Promo
                </Button>
              </div>

              {/* Billing Summary */}
              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-${discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>GRAND TOTAL:</span>
                  <span className="text-red-600">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handlePlaceOrder} className="text-xs gap-1">
                  <Save size={14} />
                  Save
                </Button>
                <Button variant="outline" onClick={handleKOT} className="text-xs gap-1">
                  <Printer size={14} />
                  KOT
                </Button>
                <Button variant="outline" onClick={handleGenerateBill} className="text-xs gap-1">
                  <DollarSign size={14} />
                  Bill
                </Button>
                <Button variant="outline" onClick={() => toast.info('Order sent')} className="text-xs gap-1">
                  <Send size={14} />
                  Send
                </Button>
              </div>

              {/* Add Customer Button */}
              {(orderType === 'takeaway' || orderType === 'delivery') && (
                <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full text-xs">
                      🧍‍♂️ Add Customer Info
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Customer Information</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                      <div>
                        <Label>Customer Name</Label>
                        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Phone Number</Label>
                        <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                      </div>
                      <Button onClick={() => setCustomerOpen(false)} className="w-full">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Payment Button */}
              <Button onClick={handlePayment} className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-base font-bold">
                <DollarSign size={20} className="mr-2" />
                Payment - ${total.toFixed(2)}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-black text-white px-6 py-2 text-xs flex justify-between border-t border-gray-800">
        <div className="flex items-center gap-4">
          <span>WaiterMan POS v1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Online</span>
          </div>
          <div className="flex items-center gap-2">
            <Send size={12} />
            <span>Last sync: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {[
              { method: 'Cash', icon: '💵', color: 'bg-green-600' },
              { method: 'Card', icon: '💳', color: 'bg-blue-600' },
              { method: 'UPI', icon: '📱', color: 'bg-purple-600' },
              { method: 'Split', icon: '🔀', color: 'bg-orange-600' }
            ].map(({ method, icon, color }) => (
              <Button
                key={method}
                onClick={() => processPayment(method)}
                className={`h-24 text-lg ${color} hover:opacity-90`}
              >
                {icon} {method}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Special Instructions</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Kitchen Notes for {selectedItemForNote?.item_name}</Label>
            <Textarea
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="E.g., no onions, extra spicy, well done..."
              rows={4}
              className="mt-2"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveNote} className="bg-red-600">Save Note</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code for {selectedQrTable?.table_name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {selectedQrTable?.qr_url ? (
              <>
                <img src={selectedQrTable.qr_url} alt="QR Code" className="w-64 h-64" />
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Customers can scan this QR code to place orders directly
                </p>
                <Button className="mt-4 bg-red-600">
                  <Printer size={16} className="mr-2" />
                  Print QR Code
                </Button>
              </>
            ) : (
              <p className="text-gray-500">No QR code available for this table</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
