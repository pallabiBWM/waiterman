import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [catOpen, setCatOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '' });
  const [subForm, setSubForm] = useState({ name: '', category_id: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

  const fetchSubcategories = async () => {
    try {
      const response = await axios.get(`${API}/subcategories`);
      setSubcategories(response.data);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory}`, catForm);
        toast.success('Category updated successfully');
      } else {
        await axios.post(`${API}/categories`, catForm);
        toast.success('Category created successfully');
      }
      setCatOpen(false);
      setCatForm({ name: '' });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEditCategory = (category) => {
    setCatForm({ name: category.name });
    setEditingCategory(category.id);
    setCatOpen(true);
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubcategory) {
        await axios.put(`${API}/subcategories/${editingSubcategory}`, subForm);
        toast.success('Subcategory updated successfully');
      } else {
        await axios.post(`${API}/subcategories`, subForm);
        toast.success('Subcategory created successfully');
      }
      setSubOpen(false);
      setSubForm({ name: '', category_id: '' });
      setEditingSubcategory(null);
      fetchSubcategories();
    } catch (error) {
      console.error('Error saving subcategory:', error);
      toast.error('Failed to save subcategory');
    }
  };

  const handleEditSubcategory = (subcategory) => {
    setSubForm({ name: subcategory.name, category_id: subcategory.category_id });
    setEditingSubcategory(subcategory.id);
    setSubOpen(true);
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure? This will affect menu items.')) return;
    try {
      await axios.delete(`${API}/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleDeleteSubcategory = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`${API}/subcategories/${id}`);
      toast.success('Subcategory deleted');
      fetchSubcategories();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Failed to delete subcategory');
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : 'Unknown';
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Categories</h1>
          <p className="text-gray-600">Organize your menu items</p>
        </div>

        {/* Categories Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Categories</h2>
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="add-category-button"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500"
                >
                  <Plus size={20} className="mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="cat_name">Category Name</Label>
                    <Input
                      id="cat_name"
                      data-testid="category-name-input"
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" data-testid="submit-category-button" className="w-full">
                    Create
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Card key={cat.id} className="border-0 shadow-md" data-testid="category-card">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{cat.name}</span>
                    <Button
                      data-testid="delete-category-button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Subcategories Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Subcategories</h2>
            <Dialog open={subOpen} onOpenChange={setSubOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="add-subcategory-button"
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Plus size={20} className="mr-2" />
                  Add Subcategory
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Subcategory</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubcategorySubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="parent_cat">Parent Category</Label>
                    <select
                      id="parent_cat"
                      data-testid="subcategory-parent-select"
                      className="w-full p-2 border rounded-md"
                      value={subForm.category_id}
                      onChange={(e) => setSubForm({ ...subForm, category_id: e.target.value })}
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
                  <div>
                    <Label htmlFor="sub_name">Subcategory Name</Label>
                    <Input
                      id="sub_name"
                      data-testid="subcategory-name-input"
                      value={subForm.name}
                      onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" data-testid="submit-subcategory-button" className="w-full">
                    Create
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategories.map((sub) => (
              <Card key={sub.id} className="border-0 shadow-md" data-testid="subcategory-card">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center text-base">
                    <div>
                      <div>{sub.name}</div>
                      <div className="text-xs text-gray-500 font-normal">
                        {getCategoryName(sub.category_id)}
                      </div>
                    </div>
                    <Button
                      data-testid="delete-subcategory-button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSubcategory(sub.id)}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}