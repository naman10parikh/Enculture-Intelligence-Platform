#!/usr/bin/env python3
"""
Simple test script to verify backend setup and OpenAI integration
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.services.openai_service import openai_service


async def test_configuration():
    """Test that configuration is loaded correctly."""
    print("🔧 Testing Configuration...")
    
    try:
        # Check if OpenAI API key is set
        if not settings.openai_api_key or settings.openai_api_key == "your_openai_api_key_here":
            print("❌ OpenAI API key not set. Please update your .env file.")
            return False
        
        print(f"✅ Environment: {settings.environment}")
        print(f"✅ Debug mode: {settings.debug}")
        print(f"✅ Host: {settings.host}:{settings.port}")
        print(f"✅ OpenAI model: {settings.openai_model}")
        print(f"✅ API key: {'*' * 10}...{settings.openai_api_key[-4:]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False


async def test_openai_connection():
    """Test OpenAI API connection."""
    print("\n🤖 Testing OpenAI Connection...")
    
    try:
        # Test simple completion
        response = await openai_service.get_chat_completion(
            messages=[{"role": "user", "content": "Hello, this is a test message."}]
        )
        
        if response and len(response) > 0:
            print("✅ OpenAI connection successful")
            print(f"✅ Response received: {response[:100]}...")
            return True
        else:
            print("❌ Empty response from OpenAI")
            return False
            
    except Exception as e:
        print(f"❌ OpenAI connection failed: {e}")
        return False


async def test_streaming():
    """Test streaming functionality."""
    print("\n📡 Testing Streaming...")
    
    try:
        messages = [{"role": "user", "content": "Count from 1 to 5 slowly."}]
        
        response_chunks = []
        async for chunk in openai_service.chat_completion_streaming(
            messages=messages,
            use_tools=False
        ):
            response_chunks.append(chunk)
            print("📥", chunk, end="", flush=True)
        
        if response_chunks:
            print("\n✅ Streaming test successful")
            return True
        else:
            print("\n❌ No streaming chunks received")
            return False
            
    except Exception as e:
        print(f"\n❌ Streaming test failed: {e}")
        return False


async def test_survey_generation():
    """Test survey generation functionality."""
    print("\n📋 Testing Survey Generation...")
    
    try:
        questions = await openai_service.generate_survey_questions(
            survey_context="Team collaboration and communication assessment",
            num_questions=3,
            question_types=["multiple_choice", "rating"]
        )
        
        if questions and len(questions) > 0:
            print("✅ Survey generation successful")
            print(f"✅ Generated {len(questions)} questions")
            for i, q in enumerate(questions, 1):
                if isinstance(q, dict):
                    print(f"   {i}. {q.get('question', 'N/A')} ({q.get('type', 'N/A')})")
            return True
        else:
            print("❌ No survey questions generated")
            return False
            
    except Exception as e:
        print(f"❌ Survey generation failed: {e}")
        return False


def check_environment_file():
    """Check if .env file exists and provide guidance."""
    print("📁 Checking Environment Setup...")
    
    env_file = Path(".env")
    env_example = Path("env.example")
    
    if not env_file.exists():
        print("❌ .env file not found")
        if env_example.exists():
            print("💡 Found env.example. Copy it to .env and update with your settings:")
            print(f"   cp {env_example} {env_file}")
        print("📝 Required environment variables:")
        print("   - OPENAI_API_KEY (your OpenAI API key)")
        print("   - ENVIRONMENT (development/production)")
        print("   - DEBUG (True/False)")
        return False
    else:
        print("✅ .env file found")
        return True


async def main():
    """Run all tests."""
    print("🧪 Enculture Backend Setup Test")
    print("=" * 40)
    
    # Check environment file
    if not check_environment_file():
        print("\n❌ Setup incomplete. Please create .env file first.")
        return
    
    tests = [
        ("Configuration", test_configuration),
        ("OpenAI Connection", test_openai_connection),
        ("Streaming", test_streaming),
        ("Survey Generation", test_survey_generation),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 40)
    print("📊 Test Results Summary:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nPassed: {passed}/{len(results)} tests")
    
    if passed == len(results):
        print("\n🎉 All tests passed! Backend is ready to use.")
        print("\n🚀 To start the server, run:")
        print("   python main.py")
    else:
        print(f"\n⚠️  {len(results) - passed} test(s) failed. Please check the errors above.")


if __name__ == "__main__":
    asyncio.run(main())
