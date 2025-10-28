import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchTables();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    }
  };

  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const getTableName = (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    return table ? table.table_name : 'N/A';
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`${API}/orders/${orderId}/status`, { order_status: newStatus });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      preparing: 'bg-blue-100 text-blue-700',
      ready: 'bg-purple-100 text-purple-700',
      served: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const statusFlow = ['pending', 'preparing', 'ready', 'served', 'completed'];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Orders</h1>
          <p className="text-gray-600">Manage customer orders</p>
        </div>

        <div className="space-y-4">
          {orders.map((order) => {
            const currentIndex = statusFlow.indexOf(order.order_status);
            const nextStatus = statusFlow[currentIndex + 1];

            return (
              <Card key={order.id} className="border-0 shadow-lg" data-testid="order-card">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <div>
                      <div className="text-lg">Order #{order.id.slice(0, 8)}</div>
                      <div className="text-sm font-normal text-gray-500">
                        {order.table_id ? `Table: ${getTableName(order.table_id)}` : order.order_type}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.order_status)}`}>
                      {order.order_status}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="border-t pt-3">
                      <h4 className="font-semibold mb-2">Items:</h4>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>
                            {item.item_name} x {item.quantity}
                          </span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600">Subtotal: ${order.total_amount}</div>
                        <div className="text-sm text-gray-600">Tax: ${order.tax}</div>
                        <div className="font-bold text-lg">Total: ${order.grand_total}</div>
                      </div>
                      {nextStatus && order.order_status !== 'completed' && order.order_status !== 'cancelled' && (
                        <Button
                          data-testid="update-order-status-button"
                          onClick={() => updateOrderStatus(order.id, nextStatus)}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500"
                        >
                          Mark as {nextStatus}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {orders.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            No orders yet
          </div>
        )}
      </div>
    </AdminLayout>
  );
}