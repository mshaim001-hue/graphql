#!/usr/bin/env python3
"""
Combined GraphQL query script for audit and group_user
Executes two separate queries and combines by groupId
"""

import requests
import json
import os
from datetime import datetime

# Configuration
API_URL = "https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql"
AUTH_URL = "https://01.tomorrow-school.ai/api/auth/signin"

# GraphQL queries
AUDIT_QUERY = """
query {
    audit {
        groupId
        result {
            object {
                id
                name
                type
            }
        }
    }
}
"""

GROUP_USER_QUERY = """
query {
    group_user {
        user {
            login
        }
        groupId
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

def execute_query(token, query, query_name):
    """Execute GraphQL query and return results"""
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
                print(f"GraphQL errors for {query_name}: {data['errors']}")
                return None
            return data.get('data', {})
        else:
            print(f"Query failed for {query_name}: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error executing {query_name} query: {e}")
        return None

def combine_by_group_id(audit_data, group_user_data):
    """Combine audit and group_user data by groupId"""
    combined_results = {}
    
    # Process audit data
    for audit in audit_data:
        group_id = audit.get('groupId')
        if group_id:
            if group_id not in combined_results:
                combined_results[group_id] = {
                    'groupId': group_id,
                    'audits': [],
                    'users': []
                }
            combined_results[group_id]['audits'].append(audit)
    
    # Process group_user data
    for group_user in group_user_data:
        group_id = group_user.get('groupId')
        if group_id:
            if group_id not in combined_results:
                combined_results[group_id] = {
                    'groupId': group_id,
                    'audits': [],
                    'users': []
                }
            
            # Extract user login
            user_info = group_user.get('user', {})
            user_login = user_info.get('login')
            if user_login:
                combined_results[group_id]['users'].append({
                    'login': user_login
                })
    
    # Convert to list format
    result_list = []
    for group_id, data in combined_results.items():
        result_list.append(data)
    
    # Sort by groupId
    result_list.sort(key=lambda x: x['groupId'])
    
    return result_list

def save_results(results, filename=None):
    """Save results to JSON file"""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"group_combine_results_{timestamp}.json"
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"Results saved to: {filename}")
        print(f"Total groups: {len(results)}")
        return filename
        
    except Exception as e:
        print(f"Error saving results: {e}")
        return None

def main():
    """Main function"""
    print("Tomorrow School Group Combine Query Tool")
    print("=" * 45)
    
    # Get authentication token
    print("\nGetting authentication token...")
    token = get_auth_token()
    
    if not token:
        print("Authentication failed!")
        return
    
    print("Authentication successful!")
    
    # Execute audit query
    print("\nExecuting audit query...")
    audit_response = execute_query(token, AUDIT_QUERY, "audit")
    
    if audit_response is None:
        print("Audit query execution failed!")
        return
    
    audit_data = audit_response.get('audit', [])
    print(f"Audit query successful! Found {len(audit_data)} audit records.")
    
    # Execute group_user query
    print("\nExecuting group_user query...")
    group_user_response = execute_query(token, GROUP_USER_QUERY, "group_user")
    
    if group_user_response is None:
        print("Group_user query execution failed!")
        return
    
    group_user_data = group_user_response.get('group_user', [])
    print(f"Group_user query successful! Found {len(group_user_data)} group_user records.")
    
    # Combine data by groupId
    print("\nCombining data by groupId...")
    combined_results = combine_by_group_id(audit_data, group_user_data)
    
    # Save results
    print("\nSaving combined results...")
    filename = save_results(combined_results)
    
    if filename:
        print(f"\n✅ Success! Combined results saved to {filename}")
        
        # Show sample of results
        if combined_results:
            print("\nSample of combined results:")
            for i, group_data in enumerate(combined_results[:5]):
                group_id = group_data.get('groupId')
                audits_count = len(group_data.get('audits', []))
                users_count = len(group_data.get('users', []))
                user_logins = [user.get('login') for user in group_data.get('users', [])]
                
                print(f"  {i+1}. Group ID: {group_id}")
                print(f"      Audits: {audits_count}")
                print(f"      Users ({users_count}): {', '.join(user_logins[:3])}{'...' if len(user_logins) > 3 else ''}")
                print()
    else:
        print("❌ Failed to save results!")

if __name__ == "__main__":
    main()
