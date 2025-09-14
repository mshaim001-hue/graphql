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

def get_audits_with_results(jwt, user_id):
    """Get audits and their results separately, then combine them"""
    api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
    
    # First, get audits
    audit_query = """
    query {
        audit(where: {auditorId: {_eq: %s}}) {
            id
            grade
            createdAt
            resultId
            groupId
            auditorId
        }
    }
    """ % user_id
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {jwt}'
    }
    
    try:
        # Get audits
        response = requests.post(api_url, headers=headers, json={'query': audit_query})
        response.raise_for_status()
        
        data = response.json()
        
        if 'errors' in data:
            print("GraphQL Errors in audit query:")
            for error in data['errors']:
                print(f"  - {error['message']}")
            return None
        
        audits = data['data']['audit']
        print(f"✓ Found {len(audits)} audits")
        
        # Get result IDs
        result_ids = [audit['resultId'] for audit in audits if audit.get('resultId')]
        print(f"✓ Found {len(result_ids)} result IDs")
        
        if not result_ids:
            print("No result IDs found")
            return audits
        
        # Get results
        result_ids_str = str(result_ids).replace("'", '"')
        result_query = f"""
        query {{
            result(where: {{id: {{_in: {result_ids_str}}}}} {{
                id
                userId
                groupId
                objectId
                eventId
                grade
                createdAt
                object {{
                    name
                    type
                    authorId
                }}
            }}
        }}
        """
        
        response = requests.post(api_url, headers=headers, json={'query': result_query})
        response.raise_for_status()
        
        data = response.json()
        
        if 'errors' in data:
            print("GraphQL Errors in result query:")
            for error in data['errors']:
                print(f"  - {error['message']}")
            return audits
        
        results = data['data']['result']
        print(f"✓ Found {len(results)} results")
        
        # Create a mapping of result ID to result
        result_map = {result['id']: result for result in results}
        
        # Combine audits with their results
        for audit in audits:
            if audit.get('resultId') and audit['resultId'] in result_map:
                audit['result'] = result_map[audit['resultId']]
            else:
                audit['result'] = None
        
        return audits
        
    except Exception as e:
        print(f"Error: {e}")
        return None

def main():
    print("=== Fixing Audit-Result Connection ===")
    
    # Get credentials
    username = input("Enter username/email: ")
    password = input("Enter password: ")
    
    print("\n1. Getting JWT token...")
    jwt = get_jwt_token(username, password)
    if not jwt:
        print("Failed to get JWT token")
        return
    
    print("✓ JWT token obtained")
    
    print("\n2. Getting audits with results...")
    audits = get_audits_with_results(jwt, 2058)
    if not audits:
        print("Failed to get audit data")
        return
    
    print(f"✓ Got {len(audits)} audits")
    
    # Analyze the data
    print("\n=== ANALYSIS RESULTS ===")
    
    total_audits = len(audits)
    with_results = len([audit for audit in audits if audit.get('result')])
    without_results = total_audits - with_results
    
    print(f"Total audits: {total_audits}")
    print(f"With results: {with_results}")
    print(f"Without results: {without_results}")
    
    # Check projects
    with_objects = len([audit for audit in audits if audit.get('result', {}).get('object')])
    with_author_ids = len([audit for audit in audits if audit.get('result', {}).get('object', {}).get('authorId')])
    
    print(f"With objects: {with_objects}")
    print(f"With author IDs: {with_author_ids}")
    
    # Sample audits
    print(f"\n=== SAMPLE AUDITS WITH RESULTS ===")
    for i, audit in enumerate(audits[:5]):
        print(f"{i+1}. ID: {audit.get('id')}")
        print(f"   Grade: {audit.get('grade')}")
        print(f"   Date: {audit.get('createdAt')}")
        print(f"   resultId: {audit.get('resultId')}")
        
        if audit.get('result'):
            result = audit['result']
            object_data = result.get('object', {})
            print(f"   ✅ HAS RESULT:")
            print(f"      Result ID: {result.get('id')}")
            print(f"      Project: {object_data.get('name', 'Unknown')}")
            print(f"      Type: {object_data.get('type', 'Unknown')}")
            print(f"      Author ID: {object_data.get('authorId', 'Unknown')}")
            print(f"      User ID: {result.get('userId')}")
        else:
            print(f"   ❌ NO RESULT")
        print()
    
    # Save data
    with open('audits_with_results.json', 'w') as f:
        json.dump(audits, f, indent=2)
    
    print(f"✓ Data saved to 'audits_with_results.json'")

if __name__ == "__main__":
    main()
