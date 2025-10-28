import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import TablesPage from './pages/TablesPage';
import CategoriesPage from './pages/CategoriesPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import CustomerOrder from './pages/CustomerOrder';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/order/:tableId" element={<CustomerOrder />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;