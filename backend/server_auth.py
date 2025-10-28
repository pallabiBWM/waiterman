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
from dependencies import get_database

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="WaiterMan POS API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ ENUMS ============

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
    user: User

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

# ============ EXISTING MODELS (Categories, Menu, Tables, Orders) ============

class CategoryCreate(BaseModel):
    name: str
    branch_id: str
    status: bool = True

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    branch_id: str
    name: str
    status: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubCategoryCreate(BaseModel):
    category_id: str
    branch_id: str
    name: str
    status: bool = True

class SubCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    branch_id: str
    name: str
    status: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    branch_id: str
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
    branch_id: str
    category_id: str
    sub_category_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float
    tax: float = 0.0
    availability: bool = True
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableCreate(BaseModel):
    branch_id: str
    table_name: str
    capacity: int

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    branch_id: str
    table_name: str
    capacity: int
    status: TableStatus = TableStatus.AVAILABLE
    qr_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    price: float
    tax: float = 0.0

class OrderCreate(BaseModel):
    branch_id: str
    table_id: Optional[str] = None
    order_type: OrderType = OrderType.DINE_IN
    items: List[OrderItem]
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    branch_id: str
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
    user_obj = User(**user)
    
    return TokenResponse(access_token=access_token, user=user_obj)

@api_router.post("/auth/logout")
async def logout():
    """Logout user (client should delete token)"""
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(lambda cred=Depends(None): get_current_user(cred, db))):
    """Get current user info"""
    if isinstance(current_user['created_at'], str):
        current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    return User(**current_user)

# ============ RESTAURANT ROUTES ============

@api_router.post("/restaurants", response_model=Restaurant)
async def create_restaurant(
    restaurant: RestaurantCreate,
    current_user: dict = Depends(lambda cred=Depends(None): get_current_user(cred, db))
):
    """Create a new restaurant (Super Admin only for now)"""
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
    current_user: dict = Depends(lambda cred=Depends(None): get_current_user(cred, db))
):
    """Get all restaurants for current user"""
    query = {}
    if current_user['role'] != UserRole.SUPER_ADMIN:
        # Regular users can only see their own restaurants
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
    current_user: dict = Depends(lambda cred=Depends(None): get_current_user(cred, db))
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
    current_user: dict = Depends(lambda cred=Depends(None): get_current_user(cred, db))
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
    current_user: dict = Depends(lambda cred=Depends(None): get_current_user(cred, db))
):
    """Get branch by ID"""
    branch = await db.branches.find_one({"id": branch_id}, {"_id": 0})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    if isinstance(branch['created_at'], str):
        branch['created_at'] = datetime.fromisoformat(branch['created_at'])
    return Branch(**branch)

# ============ CATEGORY ROUTES (Updated with branch_id) ============

@api_router.post("/categories", response_model=Category)
async def create_category(
    category: CategoryCreate,
    current_user: dict = Depends(lambda cred=Depends(None): get_current_user(cred, db))
):
    """Create category (requires authentication)"""
    category_obj = Category(**category.model_dump())
    doc = category_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.categories.insert_one(doc)
    return category_obj

@api_router.get("/categories", response_model=List[Category])
async def get_categories(branch_id: Optional[str] = None):
    """Get categories (public endpoint for QR ordering)"""
    query = {}
    if branch_id:
        query['branch_id'] = branch_id
    
    categories = await db.categories.find(query, {"_id": 0}).to_list(1000)
    for cat in categories:
        if isinstance(cat['created_at'], str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

# ============ REST OF THE ENDPOINTS FOLLOW SIMILAR PATTERN ============
# Note: I'll continue with essential endpoints. Full implementation would include all CRUD operations

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
