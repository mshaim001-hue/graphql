#!/usr/bin/env python3
"""
GraphQL Introspection Test Script for Multiple Types
Tests introspection queries for audit, group_user, and other types
"""

import requests
import json
import os
from datetime import datetime

# Configuration
API_URL = "https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql"
AUTH_URL = "https://01.tomorrow-school.ai/api/auth/signin"

# Types to introspect
TYPES_TO_CHECK = [
    "audit",
    "group_user", 
    "group",
    "user",
    "result",
    "progress",
    "object"
]

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

def get_introspection_query(type_name):
    """Generate introspection query for a specific type"""
    return f"""
    {{
      __type(name: "{type_name}") {{
        name
        fields {{
          name
          type {{
            kind
            name
            ofType {{
              name
              kind
            }}
          }}
        }}
      }}
    }}
    """

def execute_introspection_query(token, type_name):
    """Execute introspection query for a specific type"""
    query = get_introspection_query(type_name)
    
    try:
        response = requests.post(
            API_URL,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            },
            json={'query': query}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                print(f"GraphQL errors for {type_name}: {data['errors']}")
                return None
            return data.get('data', {})
        else:
            print(f"Query failed for {type_name}: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error executing introspection query for {type_name}: {e}")
        return None

def print_type_info(type_name, schema_data):
    """Print formatted schema information for a type"""
    if not schema_data or '__type' not in schema_data:
        print(f"❌ No schema data found for type '{type_name}'")
        return
    
    type_info = schema_data['__type']
    if not type_info:
        print(f"❌ Type '{type_name}' not found in schema")
        return
    
    print(f"\n📋 Type: {type_info.get('name', 'Unknown')}")
    print("-" * 50)
    
    fields = type_info.get('fields', [])
    if not fields:
        print("No fields found for this type")
        return
    
    print(f"Fields ({len(fields)}):")
    
    for i, field in enumerate(fields, 1):
        field_name = field.get('name', 'Unknown')
        field_type = field.get('type', {})
        
        # Extract type information
        type_kind = field_type.get('kind', 'Unknown')
        type_name_field = field_type.get('name', 'Unknown')
        
        # Handle nested types
        of_type = field_type.get('ofType')
        if of_type:
            of_type_name = of_type.get('name', 'Unknown')
            of_type_kind = of_type.get('kind', 'Unknown')
            type_description = f"{type_kind}<{of_type_kind}: {of_type_name}>"
        else:
            type_description = f"{type_kind}: {type_name_field}"
        
        print(f"  {i:2d}. {field_name:<20} | {type_description}")

def save_all_results(all_results, filename=None):
    """Save all results to JSON file"""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"introspection_all_types_{timestamp}.json"
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(all_results, f, indent=2, ensure_ascii=False)
        
        print(f"\nResults saved to: {filename}")
        return filename
        
    except Exception as e:
        print(f"Error saving results: {e}")
        return None

def main():
    """Main function"""
    print("GraphQL Introspection Test Tool - All Types")
    print("=" * 50)
    
    # Get authentication token
    print("\nGetting authentication token...")
    token = get_auth_token()
    
    if not token:
        print("Authentication failed!")
        return
    
    print("Authentication successful!")
    
    all_results = {}
    
    # Execute introspection queries for each type
    for type_name in TYPES_TO_CHECK:
        print(f"\n🔍 Introspecting type: {type_name}")
        results = execute_introspection_query(token, type_name)
        
        if results:
            all_results[type_name] = results
            print_type_info(type_name, results)
        else:
            print(f"❌ Failed to introspect type: {type_name}")
    
    # Save all results
    print("\nSaving all results...")
    filename = save_all_results(all_results)
    
    if filename:
        print(f"\n✅ Success! All schema information saved to {filename}")
        print(f"\n📊 Summary:")
        print(f"   Types checked: {len(TYPES_TO_CHECK)}")
        print(f"   Types found: {len(all_results)}")
        print(f"   Types not found: {len(TYPES_TO_CHECK) - len(all_results)}")
    else:
        print("❌ Failed to save results!")

if __name__ == "__main__":
    main()

