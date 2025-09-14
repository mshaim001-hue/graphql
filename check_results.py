#!/usr/bin/env python3
import requests
import json
import base64

def get_jwt_token(username, password):
    """Get JWT token using username and password"""
    auth_url = 'https://01.tomorrow-school.ai/api/auth/signin'
    
    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
    
    headers = {
        'Authorization': f'Basic {credentials}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(auth_url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        if isinstance(data, str):
            jwt = data
        else:
            jwt = data.get('token') or data.get('access_token') or data.get('jwt') or data
        
        if not jwt:
            raise Exception('No token received from server')
        
        return jwt
    except Exception as e:
        print(f"Error getting JWT token: {e}")
        return None

def check_results_directly(jwt):
    """Check if we can access result table directly"""
    api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
    
    # Try to get results directly
    query = """
    query {
        result(limit: 10) {
            id
            userId
            groupId
            objectId
            eventId
            grade
            createdAt
        }
    }
    """
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {jwt}'
    }
    
    try:
        response = requests.post(api_url, headers=headers, json={'query': query})
        response.raise_for_status()
        
        data = response.json()
        
        if 'errors' in data:
            print("GraphQL Errors:")
            for error in data['errors']:
                print(f"  - {error['message']}")
            return None
        
        return data['data']['result']
    except Exception as e:
        print(f"Error checking results: {e}")
        return None

def check_specific_results(jwt, result_ids):
    """Check specific result IDs from audits"""
    api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
    
    # Try to get specific results
    query = f"""
    query {{
        result(where: {{id: {{_in: {result_ids}}}}} {{
            id
            userId
            groupId
            objectId
            eventId
            grade
            createdAt
        }}
    }}
    """
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {jwt}'
    }
    
    try:
        response = requests.post(api_url, headers=headers, json={'query': query})
        response.raise_for_status()
        
        data = response.json()
        
        if 'errors' in data:
            print("GraphQL Errors:")
            for error in data['errors']:
                print(f"  - {error['message']}")
            return None
        
        return data['data']['result']
    except Exception as e:
        print(f"Error checking specific results: {e}")
        return None

def main():
    print("=== Checking Result Table Access ===")
    
    # Get credentials
    username = input("Enter username/email: ")
    password = input("Enter password: ")
    
    print("\n1. Getting JWT token...")
    jwt = get_jwt_token(username, password)
    if not jwt:
        print("Failed to get JWT token")
        return
    
    print("✓ JWT token obtained")
    
    print("\n2. Checking direct access to result table...")
    results = check_results_directly(jwt)
    if results:
        print(f"✓ Can access result table directly! Found {len(results)} results")
        print("Sample result:")
        print(json.dumps(results[0], indent=2))
    else:
        print("❌ Cannot access result table directly")
    
    print("\n3. Loading audit data to get result IDs...")
    # Load audit data to get result IDs
    with open('audit_analysis_full.json', 'r') as f:
        audit_data = json.load(f)
    
    audits = audit_data['audits']
    result_ids = [audit['resultId'] for audit in audits if audit.get('resultId')]
    print(f"Found {len(result_ids)} result IDs from audits")
    
    if result_ids:
        print("\n4. Checking specific result IDs...")
        # Check first 10 result IDs
        sample_result_ids = result_ids[:10]
        specific_results = check_specific_results(jwt, sample_result_ids)
        
        if specific_results:
            print(f"✓ Can access specific results! Found {len(specific_results)} results")
            print("Sample specific result:")
            print(json.dumps(specific_results[0], indent=2))
        else:
            print("❌ Cannot access specific results")
    
    print("\n=== CONCLUSION ===")
    if results:
        print("✅ Проблема: GraphQL запрос audit->result не работает, но прямой доступ к result есть")
        print("💡 Решение: Нужно исправить GraphQL запрос или использовать прямой доступ к result")
    else:
        print("❌ Проблема: Нет доступа к таблице result")
        print("💡 Решение: Нужно проверить права доступа или структуру базы данных")

if __name__ == "__main__":
    main()
