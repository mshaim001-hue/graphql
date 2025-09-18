#!/usr/bin/env python3
"""
GraphQL Introspection Test Script
Tests the introspection query to get schema information
"""

import requests
import json
import os
from datetime import datetime

# Configuration
API_URL = "https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql"
AUTH_URL = "https://01.tomorrow-school.ai/api/auth/signin"

# Introspection query for group type
INTROSPECTION_QUERY = """
{
  __type(name: "user") {
    name
    fields {
      name
      type {
        kind
        name
        ofType {
          name
          kind
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

def execute_introspection_query(token):
    """Execute introspection query and return results"""
    try:
        response = requests.post(
            API_URL,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            json={'query': INTROSPECTION_QUERY}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                print(f"GraphQL errors: {data['errors']}")
                return None
            return data.get('data', {})
        else:
            print(f"Query failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error executing introspection query: {e}")
        return None

def save_results(results, filename=None):
    """Save results to JSON file"""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"introspection_group_{timestamp}.json"
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"Results saved to: {filename}")
        return filename
        
    except Exception as e:
        print(f"Error saving results: {e}")
        return None

def print_schema_info(schema_data):
    """Print formatted schema information"""
    if not schema_data or '__type' not in schema_data:
        print("No schema data found")
        return
    
    type_info = schema_data['__type']
    if not type_info:
        print("Type 'group' not found in schema")
        return
    
    print(f"\n📋 Schema Information for Type: {type_info.get('name', 'Unknown')}")
    print("=" * 60)
    
    fields = type_info.get('fields', [])
    if not fields:
        print("No fields found for this type")
        return
    
    print(f"Total fields: {len(fields)}")
    print("\nField Details:")
    print("-" * 60)
    
    for i, field in enumerate(fields, 1):
        field_name = field.get('name', 'Unknown')
        field_type = field.get('type', {})
        
        # Extract type information
        type_kind = field_type.get('kind', 'Unknown')
        type_name = field_type.get('name', 'Unknown')
        
        # Handle nested types (like NonNull, List, etc.)
        of_type = field_type.get('ofType')
        if of_type:
            of_type_name = of_type.get('name', 'Unknown')
            of_type_kind = of_type.get('kind', 'Unknown')
            type_description = f"{type_kind}<{of_type_kind}: {of_type_name}>"
        else:
            type_description = f"{type_kind}: {type_name}"
        
        print(f"{i:2d}. {field_name:<20} | {type_description}")

def main():
    """Main function"""
    print("GraphQL Introspection Test Tool")
    print("=" * 35)
    
    # Get authentication token
    print("\nGetting authentication token...")
    token = get_auth_token()
    
    if not token:
        print("Authentication failed!")
        return
    
    print("Authentication successful!")
    
    # Execute introspection query
    print("\nExecuting introspection query for 'group' type...")
    results = execute_introspection_query(token)
    
    if results is None:
        print("Introspection query execution failed!")
        return
    
    print("Introspection query successful!")
    
    # Print formatted schema information
    print_schema_info(results)
    
    # Save results
    print("\nSaving results...")
    filename = save_results(results)
    
    if filename:
        print(f"\n✅ Success! Schema information saved to {filename}")
    else:
        print("❌ Failed to save results!")

if __name__ == "__main__":
    main()
