import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import axios from 'axios';
import { getAuthHeader } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage',
    value: '',
    applied_on: 'order',
    is_active: true
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await axios.get(`${API}/discounts`, { headers: getAuthHeader() });
      setDiscounts(response.data);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast.error('Failed to fetch discounts');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/discounts`, {
        ...formData,
        value: parseFloat(formData.value)
      }, { headers: getAuthHeader() });
      toast.success('Discount created successfully');
      setOpen(false);
      setFormData({ name: '', type: 'percentage', value: '', applied_on: 'order', is_active: true });
      fetchDiscounts();
    } catch (error) {
      console.error('Error creating discount:', error);
      toast.error('Failed to create discount');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this discount?')) return;
    try {
      await axios.delete(`${API}/discounts/${id}`, { headers: getAuthHeader() });
      toast.success('Discount deleted');
      fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast.error('Failed to delete discount');
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Discounts and Promotions</h1>
            <p className="text-gray-600">Manage offers and discounts</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-discount-button" className="bg-gradient-to-r from-purple-500 to-pink-500">
                <Plus size={20} className="mr-2" />
                Add Discount
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Discount</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Discount Name</Label>
                  <Input
                    id="name"
                    data-testid="discount-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    data-testid="discount-type-select"
                    className="w-full p-2 border rounded-md"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="bogo">BOGO</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    data-testid="discount-value-input"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" data-testid="submit-discount-button" className="w-full">
                  Create Discount
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discounts.map((discount) => (
            <Card key={discount.id} className="border-0 shadow-lg" data-testid="discount-card">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{discount.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(discount.id)} data-testid="delete-discount-button">
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-semibold capitalize">{discount.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Value:</span>
                    <span className="font-bold text-blue-600">
                      {discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${discount.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {discount.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
