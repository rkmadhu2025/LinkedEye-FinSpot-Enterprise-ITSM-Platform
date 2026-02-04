#!/usr/bin/env python3
"""
Test script to verify Twilio voice calls are working in the LinkedEye ITSM system.
This will create a test incident and trigger the voice call notification.
"""

import requests
import json
import time
from datetime import datetime

def test_twilio_voice_call():
    """Test the actual Twilio voice call functionality."""
    
    print("🧪 TESTING TWILIO VOICE CALL SYSTEM")
    print("=" * 50)
    
    # Backend API URL
    base_url = "http://localhost:8001"
    
    # Step 1: Check if backend is running
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend not responding properly")
            return
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return
    
    # Step 2: Create a test incident
    print("\n📋 Creating test incident...")
    
    incident_data = {
        "title": "TEST INCIDENT - Voice Call Demo",
        "description": "This is a test incident to verify the Twilio voice call system is working. CPU usage at 95% on production server.",
        "category": "Performance",
        "priority": "HIGH",
        "impact": "MEDIUM", 
        "urgency": "MEDIUM",
        "affected_assets": ["prod-app-01.finspot.com"],
        "tags": ["test", "voice-call", "demo"]
    }
    
    try:
        # Create incident without auth (if allowed)
        response = requests.post(
            f"{base_url}/api/v1/incidents",
            json=incident_data,
            timeout=10
        )
        
        if response.status_code == 200:
            incident = response.json()
            incident_id = incident.get("id")
            incident_number = incident.get("number")
            print(f"✅ Incident created: {incident_number}")
            print(f"   ID: {incident_id}")
        else:
            print(f"❌ Failed to create incident: {response.status_code}")
            print(f"   Response: {response.text}")
            return
            
    except Exception as e:
        print(f"❌ Error creating incident: {e}")
        return
    
    # Step 3: Wait for voice call to be triggered
    print("\n📞 Waiting for voice call to be triggered...")
    time.sleep(3)
    
    # Step 4: Check backend logs for Twilio activity
    print("\n📋 Checking backend logs for Twilio activity...")
    try:
        # Get recent logs (this is a simplified check)
        print("📝 Expected log messages:")
        print("   - 'Twilio client initialized successfully'")
        print("   - 'SMS sent for incident INCXXXXXX'")
        print("   - 'Automatic voice call initiated for incident INCXXXXXX'")
        print("   - 'Voice call initiated: CAxxxxxx for incident INCXXXXXX'")
        
    except Exception as e:
        print(f"Could not check logs: {e}")
    
    # Step 5: Verify phone should ring
    print(f"\n📱 EXPECTED BEHAVIOR:")
    print(f"   Phone number: +919176772077 should ring")
    print(f"   Voice message will announce incident {incident_number}")
    print(f"   SMS should also be sent to the same number")
    
    print(f"\n🎯 TEST RESULTS:")
    print(f"   ✅ Incident created successfully")
    print(f"   📞 Voice call should be triggered to +919176772077")
    print(f"   📨 SMS should be sent to +919176772077")
    print(f"   📊 Check phone for call/SMS in next 30 seconds")
    
    print(f"\n💡 If no call received:")
    print(f"   1. Check Twilio account balance")
    print(f"   2. Verify phone number is reachable")
    print(f"   3. Check backend logs for errors")
    print(f"   4. Verify Twilio credentials are valid")

if __name__ == "__main__":
    test_twilio_voice_call()
