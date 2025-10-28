import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import axios from 'axios';
import { getAuthHeader } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    table_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: '',
    reservation_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchReservations();
    fetchTables();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await axios.get(`${API}/reservations`, { headers: getAuthHeader() });
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`, { headers: getAuthHeader() });
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/reservations`, {
        ...formData,
        party_size: parseInt(formData.party_size)
      }, { headers: getAuthHeader() });
      toast.success('Reservation created');
      setOpen(false);
      setFormData({ table_id: '', customer_name: '', customer_phone: '', customer_email: '', party_size: '', reservation_date: '', notes: '' });
      fetchReservations();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Failed to create reservation');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/reservations/${id}/status?status=${status}`, {}, { headers: getAuthHeader() });
      toast.success('Reservation updated');
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast.error('Failed to update reservation');
    }
  };

  return (
    <AdminLayout>
      <div className=\"p-8\">
        <div className=\"flex justify-between items-center mb-8\">
          <div>
            <h1 className=\"text-4xl font-bold text-gray-800 mb-2\">Reservations</h1>
            <p className=\"text-gray-600\">Manage table reservations</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid=\"add-reservation-button\" className=\"bg-gradient-to-r from-green-500 to-emerald-500\">
                <Plus size={20} className=\"mr-2\" />
                Add Reservation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reservation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className=\"space-y-4\">
                <div>
                  <Label>Table</Label>
                  <select className=\"w-full p-2 border rounded-md\" value={formData.table_id} onChange={(e) => setFormData({ ...formData, table_id: e.target.value })} required>
                    <option value=\"\">Select Table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>{t.table_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <Input value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} required />
                </div>
                <div>
                  <Label>Party Size</Label>
                  <Input type=\"number\" value={formData.party_size} onChange={(e) => setFormData({ ...formData, party_size: e.target.value })} required />
                </div>
                <div>
                  <Label>Date & Time</Label>
                  <Input type=\"datetime-local\" value={formData.reservation_date} onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })} required />
                </div>
                <Button type=\"submit\" className=\"w-full\">Create Reservation</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className=\"space-y-4\">
          {reservations.map((res) => (
            <Card key={res.id} className=\"border-0 shadow-lg\" data-testid=\"reservation-card\">
              <CardHeader>
                <CardTitle className=\"flex justify-between\">
                  <span>{res.customer_name}</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {res.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className=\"grid grid-cols-2 gap-4\">
                  <div><span className=\"text-gray-600\">Phone:</span> {res.customer_phone}</div>
                  <div><span className=\"text-gray-600\">Party Size:</span> {res.party_size}</div>
                  <div><span className=\"text-gray-600\">Date:</span> {new Date(res.reservation_date).toLocaleString()}</div>
                </div>
                <div className=\"flex gap-2 mt-4\">
                  <Button size=\"sm\" onClick={() => updateStatus(res.id, 'confirmed')}>Confirm</Button>
                  <Button size=\"sm\" variant=\"outline\" onClick={() => updateStatus(res.id, 'cancelled')}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
