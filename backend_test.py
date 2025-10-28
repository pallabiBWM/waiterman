import requests
import sys
import json
from datetime import datetime

class WaiterManAPITester:
    def __init__(self, base_url="https://order-system-50.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'categories': [],
            'subcategories': [],
            'menu_items': [],
            'tables': [],
            'orders': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'id' in response_data:
                        print(f"   Response ID: {response_data['id']}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_tables', 'occupied_tables', 'available_tables', 
                             'total_orders', 'today_orders', 'total_revenue', 
                             'today_revenue', 'total_menu_items']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in dashboard stats: {field}")
                    return False
            print(f"   Dashboard stats: {response}")
        return success

    def test_categories_crud(self):
        """Test category CRUD operations"""
        # Create category
        success, response = self.run_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data={"name": "Test Category", "status": True}
        )
        if not success:
            return False
        
        category_id = response.get('id')
        self.created_ids['categories'].append(category_id)

        # Get categories
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        if not success:
            return False

        # Update category
        success, response = self.run_test(
            "Update Category",
            "PUT",
            f"categories/{category_id}",
            200,
            data={"name": "Updated Test Category", "status": True}
        )
        if not success:
            return False

        return True

    def test_subcategories_crud(self):
        """Test subcategory CRUD operations"""
        if not self.created_ids['categories']:
            print("❌ No categories available for subcategory test")
            return False

        category_id = self.created_ids['categories'][0]
        
        # Create subcategory
        success, response = self.run_test(
            "Create Subcategory",
            "POST",
            "subcategories",
            200,
            data={"category_id": category_id, "name": "Test Subcategory", "status": True}
        )
        if not success:
            return False
        
        subcategory_id = response.get('id')
        self.created_ids['subcategories'].append(subcategory_id)

        # Get subcategories
        success, response = self.run_test(
            "Get Subcategories",
            "GET",
            "subcategories",
            200
        )
        if not success:
            return False

        return True

    def test_menu_items_crud(self):
        """Test menu item CRUD operations"""
        if not self.created_ids['categories']:
            print("❌ No categories available for menu item test")
            return False

        category_id = self.created_ids['categories'][0]
        
        # Create menu item
        success, response = self.run_test(
            "Create Menu Item",
            "POST",
            "menu/item",
            200,
            data={
                "category_id": category_id,
                "name": "Test Menu Item",
                "description": "A delicious test item",
                "price": 99.99,
                "tax": 9.99,
                "availability": True
            }
        )
        if not success:
            return False
        
        menu_item_id = response.get('id')
        self.created_ids['menu_items'].append(menu_item_id)

        # Get menu items
        success, response = self.run_test(
            "Get Menu Items",
            "GET",
            "menu/items",
            200
        )
        if not success:
            return False

        # Get available menu items only
        success, response = self.run_test(
            "Get Available Menu Items",
            "GET",
            "menu/items",
            200,
            params={"available_only": "true"}
        )
        if not success:
            return False

        return True

    def test_tables_crud(self):
        """Test table CRUD operations"""
        # Create table
        success, response = self.run_test(
            "Create Table",
            "POST",
            "tables",
            200,
            data={
                "table_name": "Test Table 1",
                "capacity": 4,
                "branch_id": "main"
            }
        )
        if not success:
            return False
        
        table_id = response.get('id')
        self.created_ids['tables'].append(table_id)
        
        # Check if QR code was generated
        if 'qr_url' not in response or not response['qr_url']:
            print("❌ QR code not generated for table")
            return False
        print(f"   QR code generated: {response['qr_url'][:50]}...")

        # Get tables
        success, response = self.run_test(
            "Get Tables",
            "GET",
            "tables",
            200
        )
        if not success:
            return False

        # Get specific table
        success, response = self.run_test(
            "Get Specific Table",
            "GET",
            f"tables/{table_id}",
            200
        )
        if not success:
            return False

        # Get table QR code
        success, response = self.run_test(
            "Get Table QR Code",
            "GET",
            f"tables/{table_id}/qr",
            200
        )
        if not success:
            return False

        return True

    def test_orders_crud(self):
        """Test order CRUD operations"""
        if not self.created_ids['tables'] or not self.created_ids['menu_items']:
            print("❌ No tables or menu items available for order test")
            return False

        table_id = self.created_ids['tables'][0]
        menu_item_id = self.created_ids['menu_items'][0]
        
        # Create order
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data={
                "table_id": table_id,
                "order_type": "dine_in",
                "items": [
                    {
                        "item_id": menu_item_id,
                        "item_name": "Test Menu Item",
                        "quantity": 2,
                        "price": 99.99,
                        "tax": 9.99
                    }
                ],
                "customer_name": "Test Customer",
                "customer_phone": "1234567890"
            }
        )
        if not success:
            return False
        
        order_id = response.get('id')
        self.created_ids['orders'].append(order_id)

        # Verify order totals
        expected_total = 2 * 99.99  # 199.98
        expected_tax = 2 * 9.99     # 19.98
        expected_grand_total = expected_total + expected_tax  # 219.96
        
        if abs(response.get('total_amount', 0) - expected_total) > 0.01:
            print(f"❌ Incorrect total amount: {response.get('total_amount')} vs {expected_total}")
            return False
        
        if abs(response.get('grand_total', 0) - expected_grand_total) > 0.01:
            print(f"❌ Incorrect grand total: {response.get('grand_total')} vs {expected_grand_total}")
            return False

        # Get orders
        success, response = self.run_test(
            "Get Orders",
            "GET",
            "orders",
            200
        )
        if not success:
            return False

        # Get specific order
        success, response = self.run_test(
            "Get Specific Order",
            "GET",
            f"orders/{order_id}",
            200
        )
        if not success:
            return False

        # Update order status
        success, response = self.run_test(
            "Update Order Status to Preparing",
            "PATCH",
            f"orders/{order_id}/status",
            200,
            data={"order_status": "preparing"}
        )
        if not success:
            return False

        # Update order status to completed (should free table)
        success, response = self.run_test(
            "Update Order Status to Completed",
            "PATCH",
            f"orders/{order_id}/status",
            200,
            data={"order_status": "completed"}
        )
        if not success:
            return False

        return True

    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete orders
        for order_id in self.created_ids['orders']:
            try:
                requests.delete(f"{self.api_url}/orders/{order_id}")
            except:
                pass

        # Delete menu items
        for item_id in self.created_ids['menu_items']:
            try:
                requests.delete(f"{self.api_url}/menu/item/{item_id}")
            except:
                pass

        # Delete subcategories
        for sub_id in self.created_ids['subcategories']:
            try:
                requests.delete(f"{self.api_url}/subcategories/{sub_id}")
            except:
                pass

        # Delete categories
        for cat_id in self.created_ids['categories']:
            try:
                requests.delete(f"{self.api_url}/categories/{cat_id}")
            except:
                pass

        # Delete tables
        for table_id in self.created_ids['tables']:
            try:
                requests.delete(f"{self.api_url}/tables/{table_id}")
            except:
                pass

def main():
    print("🚀 Starting WaiterMan POS API Tests")
    print("=" * 50)
    
    tester = WaiterManAPITester()
    
    try:
        # Test dashboard stats first
        if not tester.test_dashboard_stats():
            print("❌ Dashboard stats test failed")
            return 1

        # Test categories
        if not tester.test_categories_crud():
            print("❌ Categories CRUD test failed")
            return 1

        # Test subcategories
        if not tester.test_subcategories_crud():
            print("❌ Subcategories CRUD test failed")
            return 1

        # Test menu items
        if not tester.test_menu_items_crud():
            print("❌ Menu items CRUD test failed")
            return 1

        # Test tables
        if not tester.test_tables_crud():
            print("❌ Tables CRUD test failed")
            return 1

        # Test orders
        if not tester.test_orders_crud():
            print("❌ Orders CRUD test failed")
            return 1

        # Print final results
        print("\n" + "=" * 50)
        print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
        
        if tester.tests_passed == tester.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1

    finally:
        # Always cleanup
        tester.cleanup()

if __name__ == "__main__":
    sys.exit(main())