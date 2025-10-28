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
    get_current_user, require_role, UserRole
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
class MenuItemCreate(BaseModel):
    category_id: str
    sub_category_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float
    tax: float = 0.0
    availability: bool = True
    image_url: Optional[str] = None

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    sub_category_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float
    tax: float = 0.0
    availability: bool = True
    image_url: Optional[str] = None
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