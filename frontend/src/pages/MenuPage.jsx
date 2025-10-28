import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pricing: {
      dine_in: '',
      takeaway: '',
      delivery: ''
    },
    tax: '',
    category_id: '',
    sub_category_id: '',
    availability: true,
    modifiers: []
  });
  const [subcategories, setSubcategories] = useState([]);
  const [newModifier, setNewModifier] = useState({ name: '', price: '' });

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API}/menu/items`);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to fetch menu items');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/menu/item`, {
        ...formData,
        price: parseFloat(formData.price),
        tax: parseFloat(formData.tax || 0),
      });
      toast.success('Menu item created successfully');
      setOpen(false);
      setFormData({ name: '', description: '', price: '', tax: '', category_id: '', availability: true });
      fetchMenuItems();
    } catch (error) {
      console.error('Error creating menu item:', error);
      toast.error('Failed to create menu item');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`${API}/menu/item/${id}`);
      toast.success('Menu item deleted');
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : 'Unknown';
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Menu Items</h1>
            <p className="text-gray-600">Manage your restaurant menu</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-menu-item-button"
                className="bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                <Plus size={20} className="mr-2" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Menu Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      data-testid="menu-item-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      data-testid="menu-item-category-select"
                      className="w-full p-2 border rounded-md"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    data-testid="menu-item-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      data-testid="menu-item-price-input"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax">Tax (₹)</Label>
                    <Input
                      id="tax"
                      data-testid="menu-item-tax-input"
                      type="number"
                      step="0.01"
                      value={formData.tax}
                      onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" data-testid="submit-menu-item-button" className="w-full">
                  Create Item
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card key={item.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="menu-item-card">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500 font-normal mt-1">
                      {getCategoryName(item.category_id)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      data-testid="delete-menu-item-button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-3">{item.description || 'No description'}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-blue-600">₹{item.price}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      item.availability ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.availability ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}