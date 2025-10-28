import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, QrCode, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState('');
  const [formData, setFormData] = useState({
    table_name: '',
    capacity: '',
    branch_id: 'main',
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to fetch tables');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tables`, {
        ...formData,
        capacity: parseInt(formData.capacity),
      });
      toast.success('Table created successfully');
      setOpen(false);
      setFormData({ table_name: '', capacity: '', branch_id: 'main' });
      fetchTables();
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error('Failed to create table');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    try {
      await axios.delete(`${API}/tables/${id}`);
      toast.success('Table deleted successfully');
      fetchTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error('Failed to delete table');
    }
  };

  const showQr = (qrUrl) => {
    setSelectedQr(qrUrl);
    setQrOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'occupied':
        return 'bg-red-100 text-red-700';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Tables</h1>
            <p className="text-gray-600">Manage your restaurant tables</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-table-button"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg"
              >
                <Plus size={20} className="mr-2" />
                Add Table
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Table</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="table_name">Table Name</Label>
                  <Input
                    id="table_name"
                    data-testid="table-name-input"
                    value={formData.table_name}
                    onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                    placeholder="e.g., Table 1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    data-testid="table-capacity-input"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="e.g., 4"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="submit-table-button"
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                >
                  Create Table
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => (
            <Card key={table.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="table-card">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{table.table_name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(table.status)}`}>
                    {table.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Capacity: {table.capacity} people</p>
                <div className="flex gap-2">
                  <Button
                    data-testid="view-qr-button"
                    variant="outline"
                    size="sm"
                    onClick={() => showQr(table.qr_url)}
                    className="flex-1"
                  >
                    <QrCode size={16} className="mr-2" />
                    QR
                  </Button>
                  <Button
                    data-testid="delete-table-button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(table.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* QR Code Dialog */}
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Table QR Code</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center p-4">
              {selectedQr && (
                <img src={selectedQr} alt="QR Code" className="max-w-full" data-testid="qr-code-image" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}