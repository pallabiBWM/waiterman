from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Database dependency
client = None

def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    global client
    if client is None:
        mongo_url = os.environ['MONGO_URL']
        client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    return db
