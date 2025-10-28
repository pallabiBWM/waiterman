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

export default function StaffPage() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'staff'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, { headers: getAuthHeader() });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch staff');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/register`, formData, { headers: getAuthHeader() });
      toast.success('Staff member added');
      setOpen(false);
      setFormData({ email: '', password: '', name: '', role: 'staff' });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.detail || 'Failed to add staff');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    try {
      await axios.delete(`${API}/users/${id}`, { headers: getAuthHeader() });
      toast.success('Staff deleted');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete staff');
    }
  };

  return (
    <AdminLayout>
      <div className=\"p-8\">
        <div className=\"flex justify-between items-center mb-8\">
          <div>
            <h1 className=\"text-4xl font-bold text-gray-800 mb-2\">Staff Management</h1>
            <p className=\"text-gray-600\">Manage users and roles</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid=\"add-staff-button\" className=\"bg-gradient-to-r from-blue-500 to-cyan-500\">
                <Plus size={20} className=\"mr-2\" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className=\"space-y-4\">
                <div>
                  <Label htmlFor=\"name\">Name</Label>
                  <Input id=\"name\" data-testid=\"staff-name-input\" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor=\"email\">Email</Label>
                  <Input id=\"email\" type=\"email\" data-testid=\"staff-email-input\" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor=\"password\">Password</Label>
                  <Input id=\"password\" type=\"password\" data-testid=\"staff-password-input\" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor=\"role\">Role</Label>
                  <select id=\"role\" data-testid=\"staff-role-select\" className=\"w-full p-2 border rounded-md\" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value=\"staff\">Staff</option>
                    <option value=\"manager\">Manager</option>
                    <option value=\"branch_admin\">Branch Admin</option>
                    <option value=\"super_admin\">Super Admin</option>
                  </select>
                </div>
                <Button type=\"submit\" data-testid=\"submit-staff-button\" className=\"w-full\">Add Staff</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
          {users.map((user) => (
            <Card key={user.id} className=\"border-0 shadow-lg\" data-testid=\"staff-card\">
              <CardHeader>
                <CardTitle className=\"flex justify-between items-center\">
                  <span>{user.name}</span>
                  <Button variant=\"ghost\" size=\"sm\" onClick={() => handleDelete(user.id)} data-testid=\"delete-staff-button\">
                    <Trash2 size={16} className=\"text-red-600\" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className=\"space-y-2\">
                  <div><span className=\"text-gray-600\">Email:</span> {user.email}</div>
                  <div>
                    <span className=\"px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs capitalize\">
                      {user.role.replace('_', ' ')}
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
