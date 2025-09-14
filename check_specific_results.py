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

def check_specific_result(jwt, result_id):
    """Check if a specific result exists"""
    api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
    
    query = f"""
    query {{
        result(where: {{id: {{_eq: {result_id}}}}}) {{
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
            print(f"GraphQL Errors for result {result_id}:")
            for error in data['errors']:
                print(f"  - {error['message']}")
            return None
        
        results = data['data']['result']
        return results[0] if results else None
        
    except Exception as e:
        print(f"Error checking result {result_id}: {e}")
        return None

def main():
    print("=== Checking Specific Results ===")
    
    # Get credentials
    username = input("Enter username/email: ")
    password = input("Enter password: ")
    
    print("\n1. Getting JWT token...")
    jwt = get_jwt_token(username, password)
    if not jwt:
        print("Failed to get JWT token")
        return
    
    print("✓ JWT token obtained")
    
    print("\n2. Loading audit data...")
    with open('audit_analysis_full.json', 'r') as f:
        data = json.load(f)
    
    audits = data['audits']
    result_ids = [audit['resultId'] for audit in audits if audit.get('resultId')]
    
    print(f"Found {len(result_ids)} result IDs to check")
    
    print("\n3. Checking first 5 result IDs...")
    found_results = 0
    not_found_results = 0
    
    for i, result_id in enumerate(result_ids[:5]):
        print(f"\nChecking result ID {result_id}...")
        result = check_specific_result(jwt, result_id)
        
        if result:
            print(f"✅ FOUND result {result_id}:")
            print(f"   User ID: {result.get('userId')}")
            print(f"   Group ID: {result.get('groupId')}")
            print(f"   Object ID: {result.get('objectId')}")
            print(f"   Event ID: {result.get('eventId')}")
            print(f"   Grade: {result.get('grade')}")
            print(f"   Created: {result.get('createdAt')}")
            found_results += 1
        else:
            print(f"❌ NOT FOUND result {result_id}")
            not_found_results += 1
    
    print(f"\n=== SUMMARY ===")
    print(f"Found: {found_results}")
    print(f"Not found: {not_found_results}")
    
    if found_results > 0:
        print("\n✅ РЕШЕНИЕ: Результаты существуют! Проблема в GraphQL запросе.")
        print("💡 Нужно исправить запрос audit->result в веб-приложении.")
    else:
        print("\n❌ ПРОБЛЕМА: Результаты не существуют в базе данных.")
        print("💡 Возможно, результаты были удалены или resultId неправильные.")

if __name__ == "__main__":
    main()
