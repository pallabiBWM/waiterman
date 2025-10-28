import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import axios from 'axios';
import { DollarSign, ShoppingBag, Utensils, Grid3x3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats
    ? [
        {
          title: 'Today Revenue',
          value: `$${stats.today_revenue}`,
          icon: DollarSign,
          gradient: 'from-blue-500 to-cyan-500',
          testId: 'stat-today-revenue'
        },
        {
          title: 'Today Orders',
          value: stats.today_orders,
          icon: ShoppingBag,
          gradient: 'from-purple-500 to-pink-500',
          testId: 'stat-today-orders'
        },
        {
          title: 'Available Tables',
          value: `${stats.available_tables}/${stats.total_tables}`,
          icon: Grid3x3,
          gradient: 'from-green-500 to-emerald-500',
          testId: 'stat-available-tables'
        },
        {
          title: 'Menu Items',
          value: stats.total_menu_items,
          icon: Utensils,
          gradient: 'from-orange-500 to-red-500',
          testId: 'stat-menu-items'
        },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome to WaiterMan POS - Your restaurant management system</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300" data-testid={card.testId}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {card.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                      <Icon className="text-white" size={20} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800">{card.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {stats && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Revenue</span>
                  <span className="font-bold text-lg">${stats.total_revenue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Orders</span>
                  <span className="font-bold text-lg">{stats.total_orders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Occupied Tables</span>
                  <span className="font-bold text-lg">{stats.occupied_tables}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}