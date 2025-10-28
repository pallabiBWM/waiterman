import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import axios from 'axios';
import { getAuthHeader } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ReportsPage() {
  const [salesReport, setSalesReport] = useState(null);
  const [itemsReport, setItemsReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [salesRes, itemsRes] = await Promise.all([
        axios.get(`${API}/reports/sales`, { headers: getAuthHeader() }),
        axios.get(`${API}/reports/items`, { headers: getAuthHeader() })
      ]);
      setSalesReport(salesRes.data);
      setItemsReport(itemsRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className=\"flex items-center justify-center h-screen\">
          <div className=\"text-gray-500\">Loading reports...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className=\"p-8\">
        <div className=\"mb-8\">
          <h1 className=\"text-4xl font-bold text-gray-800 mb-2\">Reports & Analytics</h1>
          <p className=\"text-gray-600\">Track your restaurant performance</p>
        </div>

        {salesReport && (
          <>
            <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6 mb-8\">
              <Card className=\"border-0 shadow-lg\" data-testid=\"total-sales-card\">
                <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                  <CardTitle className=\"text-sm font-medium text-gray-600\">Total Sales</CardTitle>
                  <DollarSign className=\"text-green-600\" size={20} />
                </CardHeader>
                <CardContent>
                  <div className=\"text-3xl font-bold text-gray-800\">₹{salesReport.total_sales}</div>
                </CardContent>
              </Card>

              <Card className=\"border-0 shadow-lg\" data-testid=\"total-orders-card\">
                <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                  <CardTitle className=\"text-sm font-medium text-gray-600\">Total Orders</CardTitle>
                  <ShoppingCart className=\"text-blue-600\" size={20} />
                </CardHeader>
                <CardContent>
                  <div className=\"text-3xl font-bold text-gray-800\">{salesReport.total_orders}</div>
                </CardContent>
              </Card>

              <Card className=\"border-0 shadow-lg\" data-testid=\"avg-order-card\">
                <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                  <CardTitle className=\"text-sm font-medium text-gray-600\">Avg Order Value</CardTitle>
                  <TrendingUp className=\"text-purple-600\" size={20} />
                </CardHeader>
                <CardContent>
                  <div className=\"text-3xl font-bold text-gray-800\">₹{salesReport.avg_order_value}</div>
                </CardContent>
              </Card>
            </div>

            <Card className=\"border-0 shadow-lg mb-8\">
              <CardHeader>
                <CardTitle>Sales by Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className=\"space-y-3\">
                  {Object.entries(salesReport.sales_by_date).map(([date, data]) => (
                    <div key={date} className=\"flex justify-between items-center border-b pb-2\" data-testid=\"sales-date-item\">
                      <span className=\"text-gray-700\">{date}</span>
                      <div className=\"flex gap-4\">
                        <span className=\"text-gray-600\">{data.orders} orders</span>
                        <span className=\"font-bold text-green-600\">₹{data.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {itemsReport && (
          <Card className=\"border-0 shadow-lg\">
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Package size={24} />
                Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-3\">
                {itemsReport.items.slice(0, 10).map((item) => (
                  <div key={item.item_id} className=\"flex justify-between items-center border-b pb-2\" data-testid=\"top-item\">
                    <div>
                      <div className=\"font-medium text-gray-800\">{item.item_name}</div>
                      <div className=\"text-sm text-gray-500\">{item.quantity_sold} units sold</div>
                    </div>
                    <div className=\"text-lg font-bold text-blue-600\">₹{item.revenue.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
