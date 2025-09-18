#!/usr/bin/env python3
"""
Full GraphQL query script for user data
Uses all available fields from the user schema
"""

import requests
import json
import os
from datetime import datetime

# Configuration
API_URL = "https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql"
AUTH_URL = "https://01.tomorrow-school.ai/api/auth/signin"

# Full GraphQL query for user with all available fields
FULL_USER_QUERY = """
query {
    user {
        id
        login
        email
        firstName
        lastName
        campus
        avatarUrl
        discordId
        discordLogin
        githubId
        createdAt
        updatedAt
        attrs
        profile
        auditRatio
        auditsAssigned
        totalDown
        totalUp
        totalUpBonus
        public {
            id
            login
            campus
            avatarUrl
        }
        audits {
            id
            grade
            createdAt
        }
        audits_aggregate {
            aggregate {
                count
            }
        }
        events {
            id
            createdAt
        }
        events_aggregate {
            aggregate {
                count
            }
        }
        groups {
            id
            path
            createdAt
        }
        groups_aggregate {
            aggregate {
                count
            }
        }
        groupsByCaptainid {
            id
            path
            createdAt
        }
        groupsByCaptainid_aggregate {
            aggregate {
                count
            }
        }
        labels {
            id
            name
        }
        labels_aggregate {
            aggregate {
                count
            }
        }
        markdowns {
            id
            title
            createdAt
        }
        matches {
            id
            createdAt
        }
        matches_aggregate {
            aggregate {
                count
            }
        }
        objectAvailabilities {
            id
            createdAt
        }
        objectAvailabilities_aggregate {
            aggregate {
                count
            }
        }
        objects {
            id
            name
            type
            createdAt
        }
        objects_aggregate {
            aggregate {
                count
            }
        }
        progresses {
            id
            grade
            createdAt
            path
        }
        progresses_aggregate {
            aggregate {
                count
            }
        }
        progressesByPath {
            id
            grade
            createdAt
            path
        }
        progressesByPath_aggregate {
            aggregate {
                count
            }
        }
        records {
            id
            message
            createdAt
        }
        recordsByAuthorid {
            id
            message
            createdAt
        }
        registrations {
            id
            createdAt
        }
        registrations_aggregate {
            aggregate {
                count
            }
        }
        results {
            id
            grade
            createdAt
        }
        results_aggregate {
            aggregate {
                count
            }
        }
        roles {
            id
            name
        }
        roles_aggregate {
            aggregate {
                count
            }
        }
        sessions {
            id
            createdAt
        }
        sessions_aggregate {
            aggregate {
                count
            }
        }
        transactions {
            id
            amount
            type
            createdAt
        }
        transactions_aggregate {
            aggregate {
                count
                sum {
                    amount
                }
            }
        }
        user_roles {
            id
            createdAt
        }
        user_roles_aggregate {
            aggregate {
                count
            }
        }
        xps {
            id
            amount
            createdAt
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
            json={'query': FULL_USER_QUERY}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                print(f"GraphQL errors: {data['errors']}")
                return None
            return data.get('data', {}).get('user', [])
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
        filename = f"full_user_results_{timestamp}.json"
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"Results saved to: {filename}")
        print(f"Total users: {len(results)}")
        return filename
        
    except Exception as e:
        print(f"Error saving results: {e}")
        return None

def print_user_summary(users):
    """Print summary of user data"""
    if not users:
        print("No users found")
        return
    
    print(f"\n📊 User Data Summary")
    print("=" * 50)
    print(f"Total users: {len(users)}")
    
    # Show sample users
    print(f"\nSample users (first 3):")
    for i, user in enumerate(users[:3]):
        print(f"\n{i+1}. User: {user.get('login', 'N/A')}")
        print(f"   ID: {user.get('id', 'N/A')}")
        print(f"   Name: {user.get('firstName', '')} {user.get('lastName', '')}")
        print(f"   Campus: {user.get('campus', 'N/A')}")
        print(f"   Email: {user.get('email', 'N/A')}")
        print(f"   Created: {user.get('createdAt', 'N/A')}")
        
        # Show some statistics
        audits_count = user.get('audits_aggregate', {}).get('aggregate', {}).get('count', 0)
        groups_count = user.get('groups_aggregate', {}).get('aggregate', {}).get('count', 0)
        results_count = user.get('results_aggregate', {}).get('aggregate', {}).get('count', 0)
        transactions_sum = user.get('transactions_aggregate', {}).get('aggregate', {}).get('sum', {}).get('amount', 0)
        
        print(f"   Audits: {audits_count}")
        print(f"   Groups: {groups_count}")
        print(f"   Results: {results_count}")
        print(f"   Total XP: {transactions_sum}")

def main():
    """Main function"""
    print("Tomorrow School Full User Query Tool")
    print("=" * 40)
    
    # Get authentication token
    print("\nGetting authentication token...")
    token = get_auth_token()
    
    if not token:
        print("Authentication failed!")
        return
    
    print("Authentication successful!")
    
    # Execute query
    print("\nExecuting full user query...")
    results = execute_query(token)
    
    if results is None:
        print("Query execution failed!")
        return
    
    print(f"Query successful! Found {len(results)} users.")
    
    # Print summary
    print_user_summary(results)
    
    # Save results
    print("\nSaving results...")
    filename = save_results(results)
    
    if filename:
        print(f"\n✅ Success! Full user data saved to {filename}")
    else:
        print("❌ Failed to save results!")

if __name__ == "__main__":
    main()
