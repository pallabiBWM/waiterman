import { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Trash2, ShoppingCart, DollarSign, Printer, Save, Send, Search, Bell, User, X, Utensils } from 'lucide-react';
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
  const [serverName] = useState('Admin User');
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
            Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT - Tables (25%) */}
        <div className="w-1/4 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-900 border-b border-gray-700">
            {['dine_in', 'takeaway', 'delivery'].map(type => (
              <Button
                key={type}
                variant={orderType === type ? 'default' : 'outline'}
                onClick={() => setOrderType(type)}
                className={orderType === type ? 'bg-red-600' : 'bg-gray-700 text-white'}
              >
                {type === 'dine_in' ? '🪑 Dine' : type === 'takeaway' ? '📦 Take' : '🛵 Deliv'}
              </Button>
            ))}
            <Button variant="outline" className="bg-gray-700 text-white">🌐 Online</Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {orderType === 'dine_in' ? (
              <div className="grid grid-cols-2 gap-2">
                {tables.map((table) => (
                  <Card
                    key={table.id}
                    className={`cursor-pointer border-2 ${
                      selectedTable?.id === table.id ? 'ring-4 ring-red-500' : getTableStatusColor(table.status)
                    }`}
                    onClick={() => setSelectedTable(table)}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="font-bold">{table.table_name}</div>
                      <div className="text-xs">{table.capacity} seats</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3 bg-gray-700 p-4 rounded">
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="bg-gray-800 text-white"
                />
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone"
                  className="bg-gray-800 text-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE - Menu (45%) */}
        <div className="flex-1 bg-gray-100 flex flex-col">
          <div className="p-3 bg-white border-b flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-10" />
            </div>
          </div>

          <div className="bg-white border-b px-3 py-2 overflow-x-auto">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className={selectedCategory === 'all' ? 'bg-red-600' : ''}
                size="sm"
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={selectedCategory === cat.id ? 'bg-red-600' : ''}
                  size="sm"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-4 gap-3">
              {filteredMenuItems.map((item) => (
                <Card key={item.id} className="hover:shadow-xl transition">
                  <CardContent className="p-3">
                    <div className="aspect-square bg-gray-200 rounded mb-2 flex items-center justify-center">
                      <Utensils size={32} className="text-gray-400" />
                    </div>
                    <div className="font-semibold text-sm mb-1 line-clamp-1">{item.name}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-red-600">
                        ${orderType === 'dine_in' ? item.pricing?.dine_in : orderType === 'takeaway' ? item.pricing?.takeaway : item.pricing?.delivery || item.price}
                      </span>
                      <Button onClick={() => addToCart(item)} size="sm" className="bg-red-600 h-8 w-8 p-0">
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
        <div className="w-[30%] bg-white border-l flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} />Order
              </h2>
              {cart.length > 0 && <Button variant="ghost" size="sm" onClick={resetOrder}><X size={16} /></Button>}
            </div>
            {selectedTable && <div className="text-sm">Table: {selectedTable.table_name}</div>}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-12">No items</div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.item_id} className="bg-gray-50 p-3 rounded border">
                    <div className="flex justify-between mb-2">
                      <div className="font-semibold text-sm">{item.item_name}</div>
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.item_id)} className="h-6 w-6 p-0">
                        <Trash2 size={14} className="text-red-600" />
                      </Button>
                    </div>
                    {item.notes && <div className="text-xs text-gray-600 italic mb-1">Note: {item.notes}</div>}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => updateQuantity(item.item_id, -1)} className="h-7 w-7 p-0">
                          <Minus size={12} />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <Button variant="outline" size="sm" onClick={() => updateQuantity(item.item_id, 1)} className="h-7 w-7 p-0">
                          <Plus size={12} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openNoteDialog(item)} className="h-7 px-2 text-xs ml-2">
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

          {cart.length > 0 && (
            <div className="border-t p-4 bg-gray-50 space-y-3">
              <div className="flex gap-2">
                <label className="text-sm">Discount %:</label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))} className="h-8" />
              </div>

              <div className="space-y-1 text-sm border-t pt-2">
                <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax:</span><span>${tax.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span>-${discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>TOTAL:</span><span className="text-red-600">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={handlePlaceOrder} className="text-xs"><Save size={14} className="mr-1" />Save</Button>
                <Button variant="outline" onClick={handleKOT} className="text-xs"><Printer size={14} className="mr-1" />KOT</Button>
                <Button variant="outline" className="text-xs"><DollarSign size={14} className="mr-1" />Bill</Button>
              </div>

              <Button onClick={handlePayment} className="w-full bg-red-600 hover:bg-red-700 py-6 font-bold">
                <DollarSign size={20} className="mr-2" />Payment ${total.toFixed(2)}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white px-6 py-2 text-xs flex justify-between">
        <div>WaiterMan POS v1.0</div>
        <div className="flex gap-4"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Online</div></div>
      </div>

      {/* Dialogs */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select Payment Method</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {['Cash', 'Card', 'UPI', 'Split'].map(method => (
              <Button key={method} onClick={() => processPayment(method)} className="h-24 text-lg">
                {method === 'Cash' ? '💵' : method === 'Card' ? '💳' : method === 'UPI' ? '📱' : '🔀'} {method}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
          <Textarea value={itemNote} onChange={(e) => setItemNote(e.target.value)} placeholder="Special instructions" rows={4} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveNote} className="bg-red-600">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
