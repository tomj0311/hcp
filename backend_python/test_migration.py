#!/usr/bin/env python3
"""
Migration helper script to test the Python backend conversion
"""
import asyncio
import sys
import os
from pathlib import Path

# Add current directory to path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from src.db import connect_db, get_collections
from src.services.seed_providers import seed_providers


async def test_database_connection():
    """Test database connection and basic operations"""
    try:
        print("🔄 Testing database connection...")
        db = await connect_db()
        print("✅ Database connected successfully")
        
        # Test collections access
        collections = get_collections()
        consumer_count = await collections['consumers'].estimated_document_count()
        provider_count = await collections['providers'].estimated_document_count()
        
        print(f"📊 Current data:")
        print(f"   - Consumers: {consumer_count}")
        print(f"   - Providers: {provider_count}")
        
        # Test seed providers
        print("🌱 Testing seed providers...")
        await seed_providers()
        
        new_provider_count = await collections['providers'].estimated_document_count()
        print(f"✅ Providers after seed: {new_provider_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False


async def test_auth_utilities():
    """Test authentication utilities"""
    try:
        print("🔐 Testing authentication utilities...")
        
        from src.utils.auth import hash_password, verify_password, generate_token, verify_token
        
        # Test password hashing
        password = "test123"
        hashed = hash_password(password)
        assert verify_password(password, hashed), "Password verification failed"
        print("✅ Password hashing works")
        
        # Test JWT tokens
        payload = {"user_id": "test", "role": "consumer"}
        token = generate_token(payload)
        decoded = verify_token(token)
        assert decoded["user_id"] == "test", "Token verification failed"
        print("✅ JWT tokens work")
        
        return True
        
    except Exception as e:
        print(f"❌ Auth test failed: {e}")
        return False


async def main():
    """Run all tests"""
    print("🚀 Testing Python FastAPI Backend Conversion")
    print("=" * 50)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Authentication Utilities", test_auth_utilities),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name} test...")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    if all_passed:
        print("\n🎉 All tests passed! The backend conversion is working correctly.")
        print("\nYou can now start the development server with:")
        print("   python dev.py")
        print("   or")
        print("   dev.bat (Windows)")
    else:
        print("\n⚠️  Some tests failed. Please check your configuration:")
        print("   1. Ensure MongoDB is running on the configured port")
        print("   2. Check your .env file settings")
        print("   3. Verify all dependencies are installed")


if __name__ == "__main__":
    asyncio.run(main())
