#!/usr/bin/env python3
"""
Simple GraphQL query script for Tomorrow School API
Executes audit query and saves results to JSON file
"""

import requests
import json
import os
from datetime import datetime

# Configuration
API_URL = "https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql"
AUTH_URL = "https://01.tomorrow-school.ai/api/auth/signin"

# GraphQL query
QUERY = """
query {
    audit(order_by: {createdAt: desc}) {
        id
        grade
        createdAt
        group {
            id
            status
            path
            members {
                user {
                    id
                    login
                }
            }
        }
    }
}
"""

def get_auth_token():
    """Get JWT token from environment variable or authenticate"""
    # First try to get token from environment
    jwt_token = os.getenv('TOMORROW_SCHOOL_JWT')
    if jwt_token:
        print("Using JWT token from environment variable")
        return jwt_token
    
    # If no env token, try to authenticate
    username = os.getenv('TOMORROW_SCHOOL_USERNAME')
    password = os.getenv('TOMORROW_SCHOOL_PASSWORD')
    
    if username and password:
        print("Authenticating with credentials from environment variables...")
        return authenticate_user(username, password)
    
    # Fallback to manual input
    print("No credentials found in environment variables.")
    print("Please set TOMORROW_SCHOOL_JWT, or TOMORROW_SCHOOL_USERNAME and TOMORROW_SCHOOL_PASSWORD")
    username = input("Enter username or email: ").strip()
    password = input("Enter password: ").strip()
    
    if not username or not password:
        print("Username and password are required!")
        return None
    
    return authenticate_user(username, password)

def authenticate_user(username, password):
    """Authenticate user and get JWT token"""
    try:
        # Create Basic Auth header
        import base64
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        
        response = requests.post(
            AUTH_URL,
            headers={
                'Authorization': f'Basic {credentials}',
                'Content-Type': 'application/json'
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            # Handle different possible response formats
            if isinstance(data, str):
                return data
            else:
                return data.get('token') or data.get('access_token') or data.get('jwt') or data
        else:
            print(f"Authentication failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error during authentication: {e}")
        return None

def execute_query(token):
    """Execute GraphQL query and return results"""
    try:
        response = requests.post(
            API_URL,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            json={'query': QUERY}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                print(f"GraphQL errors: {data['errors']}")
                return None
            return data.get('data', {}).get('audit', [])
        else:
            print(f"Query failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error executing query: {e}")
        return None

def save_results(results, filename=None):
    """Save results to JSON file"""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"audit_results_{timestamp}.json"
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"Results saved to: {filename}")
        print(f"Total records: {len(results)}")
        return filename
        
    except Exception as e:
        print(f"Error saving results: {e}")
        return None

def main():
    """Main function"""
    print("Tomorrow School Audit Query Tool")
    print("=" * 40)
    
    # Get authentication token
    print("\nGetting authentication token...")
    token = get_auth_token()
    
    if not token:
        print("Authentication failed!")
        return
    
    print("Authentication successful!")
    
    # Execute query
    print("\nExecuting audit query...")
    results = execute_query(token)
    
    if results is None:
        print("Query execution failed!")
        return
    
    print(f"Query successful! Found {len(results)} audit records.")
    
    # Save results
    print("\nSaving results...")
    filename = save_results(results)
    
    if filename:
        print(f"\n✅ Success! Results saved to {filename}")
        
        # Show sample of results
        if results:
            print("\nSample of results:")
            for i, record in enumerate(results[:3]):
                print(f"  {i+1}. ID: {record.get('id')}, Grade: {record.get('grade')}, Date: {record.get('createdAt')}")
    else:
        print("❌ Failed to save results!")

if __name__ == "__main__":
    main()
