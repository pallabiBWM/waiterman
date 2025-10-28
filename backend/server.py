from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import qrcode
import io
import base64
from enum import Enum
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user_dependency, require_role, UserRole
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class TableStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"

class OrderStatus(str, Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"

class OrderType(str, Enum):
    DINE_IN = "dine_in"
    TAKEAWAY = "takeaway"
    DELIVERY = "delivery"

# ============ MODELS ============

# ============ AUTH MODELS ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.STAFF
    restaurant_id: Optional[str] = None
    branch_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    restaurant_id: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# ============ RESTAURANT & BRANCH MODELS ============

class RestaurantCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class Restaurant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    name: str
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BranchCreate(BaseModel):
    restaurant_id: str
    name: str
    location: Optional[str] = None
    contact: Optional[str] = None

class Branch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    location: Optional[str] = None
    contact: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Category Models
class CategoryCreate(BaseModel):
    name: str
    status: bool = True

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    status: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Subcategory Models
class SubCategoryCreate(BaseModel):
    category_id: str
    name: str
    status: bool = True

class SubCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    name: str
    status: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Menu Item Models
class MenuItemModifier(BaseModel):
    name: str
    price: float = 0.0

class MenuItemPricing(BaseModel):
    dine_in: float
    takeaway: float
    delivery: float = 0.0

class MenuItemCreate(BaseModel):
    category_id: str
    sub_category_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    pricing: MenuItemPricing
    tax: float = 0.0
    availability: bool = True
    image_url: Optional[str] = None
    modifiers: Optional[List[MenuItemModifier]] = []

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    sub_category_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    pricing: MenuItemPricing
    tax: float = 0.0
    availability: bool = True
    image_url: Optional[str] = None
    modifiers: Optional[List[MenuItemModifier]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Table Models
class TableCreate(BaseModel):
    branch_id: str = "main"
    table_name: str
    capacity: int

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    branch_id: str = "main"
    table_name: str
    capacity: int
    status: TableStatus = TableStatus.AVAILABLE
    qr_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Order Models
class OrderItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    price: float
    tax: float = 0.0

class OrderCreate(BaseModel):
    table_id: Optional[str] = None
    order_type: OrderType = OrderType.DINE_IN
    items: List[OrderItem]
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: Optional[str] = None
    order_type: OrderType = OrderType.DINE_IN
    items: List[OrderItem]
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    total_amount: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    grand_total: float = 0.0
    payment_status: PaymentStatus = PaymentStatus.PENDING
    order_status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderStatusUpdate(BaseModel):
    order_status: OrderStatus

# ============ DISCOUNT & PROMOTION MODELS ============

class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    BOGO = "bogo"

class DiscountCreate(BaseModel):
    name: str
    type: DiscountType
    value: float
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True
    applied_on: str = "order"  # order, category, item

class Discount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: DiscountType
    value: float
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True
    applied_on: str = "order"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ RESERVATION MODELS ============

class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class ReservationCreate(BaseModel):
    table_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    party_size: int
    reservation_date: datetime
    notes: Optional[str] = None

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    party_size: int
    reservation_date: datetime
    status: ReservationStatus = ReservationStatus.PENDING
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ UTILITY FUNCTIONS ============

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

# ============ AUTHENTICATION ROUTES ============

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user_obj = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        restaurant_id=user_data.restaurant_id,
        branch_id=user_data.branch_id
    )
    
    doc = user_obj.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user and return JWT token"""
    # Find user
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user is active
    if not user.get('is_active', True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    # Create access token
    access_token = create_access_token(data={"sub": user['id'], "role": user['role']})
    
    # Parse user object
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    # Remove password from response
    user.pop('password', None)
    
    return TokenResponse(access_token=access_token, user=user)

@api_router.post("/auth/logout")
async def logout():
    """Logout user (client should delete token)"""
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user_dependency)):
    """Get current user info"""
    if isinstance(current_user['created_at'], str):
        current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    return User(**current_user)

# ============ RESTAURANT ROUTES ============

@api_router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(
    restaurant: RestaurantCreate,
    current_user: dict = Depends(get_current_user_dependency)
):
    """Create a new restaurant"""
    restaurant_obj = Restaurant(
        owner_id=current_user['id'],
        **restaurant.model_dump()
    )
    
    doc = restaurant_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.restaurants.insert_one(doc)
    return restaurant_obj

@api_router.get("/restaurants", response_model=List[Restaurant])
async def get_restaurants(
    current_user: dict = Depends(get_current_user_dependency)
):
    """Get all restaurants for current user"""
    query = {}
    if current_user['role'] != UserRole.SUPER_ADMIN:
        query['owner_id'] = current_user['id']
    
    restaurants = await db.restaurants.find(query, {"_id": 0}).to_list(1000)
    for rest in restaurants:
        if isinstance(rest['created_at'], str):
            rest['created_at'] = datetime.fromisoformat(rest['created_at'])
    return restaurants

# ============ BRANCH ROUTES ============

@api_router.post("/branches", response_model=Branch)
async def create_branch(
    branch: BranchCreate,
    current_user: dict = Depends(get_current_user_dependency)
):
    """Create a new branch"""
    # Verify restaurant exists and user has access
    restaurant = await db.restaurants.find_one({"id": branch.restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    if current_user['role'] not in [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN] and restaurant['owner_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    branch_obj = Branch(**branch.model_dump())
    doc = branch_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.branches.insert_one(doc)
    return branch_obj

@api_router.get("/branches", response_model=List[Branch])
async def get_branches(
    restaurant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user_dependency)
):
    """Get all branches"""
    query = {}
    if restaurant_id:
        query['restaurant_id'] = restaurant_id
    elif current_user.get('restaurant_id'):
        query['restaurant_id'] = current_user['restaurant_id']
    
    branches = await db.branches.find(query, {"_id": 0}).to_list(1000)
    for branch in branches:
        if isinstance(branch['created_at'], str):
            branch['created_at'] = datetime.fromisoformat(branch['created_at'])
    return branches

@api_router.get("/branches/{branch_id}", response_model=Branch)
async def get_branch(
    branch_id: str,
    current_user: dict = Depends(get_current_user_dependency)
):
    """Get branch by ID"""
    branch = await db.branches.find_one({"id": branch_id}, {"_id": 0})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    if isinstance(branch['created_at'], str):
        branch['created_at'] = datetime.fromisoformat(branch['created_at'])
    return Branch(**branch)

# ============ CATEGORY ROUTES ============

@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    category_obj = Category(**category.model_dump())
    doc = category_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category_obj

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    for cat in categories:
        if isinstance(cat['created_at'], str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryCreate):
    result = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category.model_dump()
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# ============ SUBCATEGORY ROUTES ============

@api_router.post("/subcategories", response_model=SubCategory)
async def create_subcategory(subcategory: SubCategoryCreate):
    # Check if category exists
    category = await db.categories.find_one({"id": subcategory.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    subcategory_obj = SubCategory(**subcategory.model_dump())
    doc = subcategory_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.subcategories.insert_one(doc)
    return subcategory_obj

@api_router.get("/subcategories", response_model=List[SubCategory])
async def get_subcategories(category_id: Optional[str] = None):
    query = {"category_id": category_id} if category_id else {}
    subcategories = await db.subcategories.find(query, {"_id": 0}).to_list(1000)
    for subcat in subcategories:
        if isinstance(subcat['created_at'], str):
            subcat['created_at'] = datetime.fromisoformat(subcat['created_at'])
    return subcategories

@api_router.put("/subcategories/{subcategory_id}", response_model=SubCategory)
async def update_subcategory(subcategory_id: str, subcategory: SubCategoryCreate):
    result = await db.subcategories.find_one({"id": subcategory_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    update_data = subcategory.model_dump()
    await db.subcategories.update_one({"id": subcategory_id}, {"$set": update_data})
    
    updated = await db.subcategories.find_one({"id": subcategory_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return SubCategory(**updated)

@api_router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(subcategory_id: str):
    result = await db.subcategories.delete_one({"id": subcategory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    return {"message": "Subcategory deleted successfully"}

# ============ MENU ITEM ROUTES ============

@api_router.post("/menu/item", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate):
    # Verify category exists
    category = await db.categories.find_one({"id": item.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    menu_item_obj = MenuItem(**item.model_dump())
    doc = menu_item_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menu_items.insert_one(doc)
    return menu_item_obj

@api_router.get("/menu/items", response_model=List[MenuItem])
async def get_menu_items(category_id: Optional[str] = None, available_only: bool = False):
    query = {}
    if category_id:
        query["category_id"] = category_id
    if available_only:
        query["availability"] = True
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.put("/menu/item/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item: MenuItemCreate):
    result = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    update_data = item.model_dump()
    await db.menu_items.update_one({"id": item_id}, {"$set": update_data})
    
    updated = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return MenuItem(**updated)

@api_router.delete("/menu/item/{item_id}")
async def delete_menu_item(item_id: str):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

# ============ TABLE ROUTES ============

@api_router.post("/tables", response_model=Table)
async def create_table(table: TableCreate):
    table_obj = Table(**table.model_dump())
    
    # Generate QR code for table ordering page
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    qr_data = f"{frontend_url}/order/{table_obj.id}"
    table_obj.qr_url = generate_qr_code(qr_data)
    
    doc = table_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tables.insert_one(doc)
    return table_obj

@api_router.get("/tables", response_model=List[Table])
async def get_tables():
    tables = await db.tables.find({}, {"_id": 0}).to_list(1000)
    for table in tables:
        if isinstance(table['created_at'], str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

@api_router.get("/tables/{table_id}", response_model=Table)
async def get_table(table_id: str):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    if isinstance(table['created_at'], str):
        table['created_at'] = datetime.fromisoformat(table['created_at'])
    return Table(**table)

@api_router.put("/tables/{table_id}", response_model=Table)
async def update_table(table_id: str, table: TableCreate):
    result = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Table not found")
    
    update_data = table.model_dump()
    await db.tables.update_one({"id": table_id}, {"$set": update_data})
    
    updated = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Table(**updated)

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str):
    result = await db.tables.delete_one({"id": table_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted successfully"}

@api_router.get("/tables/{table_id}/qr")
async def get_table_qr(table_id: str):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"qr_url": table.get('qr_url')}

# ============ ORDER ROUTES ============

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    # Calculate totals
    total_amount = sum(item.price * item.quantity for item in order.items)
    tax = sum(item.tax * item.quantity for item in order.items)
    
    order_obj = Order(**order.model_dump())
    order_obj.total_amount = total_amount
    order_obj.tax = tax
    order_obj.grand_total = total_amount + tax - order_obj.discount
    
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    # Convert nested items
    doc['items'] = [item.model_dump() for item in order_obj.items]
    
    await db.orders.insert_one(doc)
    
    # Update table status if it's a dine-in order
    if order_obj.table_id and order_obj.order_type == OrderType.DINE_IN:
        await db.tables.update_one(
            {"id": order_obj.table_id},
            {"$set": {"status": TableStatus.OCCUPIED}}
        )
    
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders(status: Optional[OrderStatus] = None, table_id: Optional[str] = None):
    query = {}
    if status:
        query["order_status"] = status
    if table_id:
        query["table_id"] = table_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if isinstance(order['created_at'], str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    return Order(**order)

@api_router.patch("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, status_update: OrderStatusUpdate):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"order_status": status_update.order_status}}
    )
    
    # If order is completed, free up the table
    if status_update.order_status == OrderStatus.COMPLETED and order.get('table_id'):
        await db.tables.update_one(
            {"id": order['table_id']},
            {"$set": {"status": TableStatus.AVAILABLE}}
        )
    
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Order(**updated)

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    # Get today's date range
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_iso = today_start.isoformat()
    
    # Count tables
    total_tables = await db.tables.count_documents({})
    occupied_tables = await db.tables.count_documents({"status": TableStatus.OCCUPIED})
    
    # Count orders
    total_orders = await db.orders.count_documents({})
    today_orders = await db.orders.count_documents({
        "created_at": {"$gte": today_start_iso}
    })
    
    # Calculate revenue
    all_orders = await db.orders.find({}, {"_id": 0, "grand_total": 1, "created_at": 1}).to_list(10000)
    total_revenue = sum(order.get('grand_total', 0) for order in all_orders)
    today_revenue = sum(
        order.get('grand_total', 0) for order in all_orders
        if order.get('created_at', '') >= today_start_iso
    )
    
    # Count menu items
    total_menu_items = await db.menu_items.count_documents({})
    
    return {
        "total_tables": total_tables,
        "occupied_tables": occupied_tables,
        "available_tables": total_tables - occupied_tables,
        "total_orders": total_orders,
        "today_orders": today_orders,
        "total_revenue": round(total_revenue, 2),
        "today_revenue": round(today_revenue, 2),
        "total_menu_items": total_menu_items
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()