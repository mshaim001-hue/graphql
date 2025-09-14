#!/usr/bin/env python3
import requests
import json
import base64
from datetime import datetime

def get_jwt_token(username, password):
    """Get JWT token using username and password"""
    auth_url = 'https://01.tomorrow-school.ai/api/auth/signin'
    
    # Create Basic Auth header
    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
    
    headers = {
        'Authorization': f'Basic {credentials}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(auth_url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        # Handle different possible response formats
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

def parse_jwt_payload(jwt):
    """Parse JWT payload to get user ID"""
    try:
        # JWT has 3 parts separated by dots
        parts = jwt.split('.')
        if len(parts) != 3:
            raise Exception('Invalid JWT format')
        
        # Decode the payload (second part)
        payload = parts[1]
        # Add padding if needed
        payload += '=' * (4 - len(payload) % 4)
        decoded = base64.b64decode(payload)
        payload_data = json.loads(decoded)
        
        return payload_data
    except Exception as e:
        print(f"Error parsing JWT: {e}")
        return {}

def analyze_audits(jwt, user_id):
    """Analyze audit data using GraphQL API"""
    api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
    
    query = """
    query {
        audit(where: {auditorId: {_eq: %s}}) {
            id
            grade
            createdAt
            result {
                id
                object {
                    name
                    type
                    authorId
                }
            }
            group {
                id
            }
        }
    }
    """ % user_id
    
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
        
        return data['data']['audit']
    except Exception as e:
        print(f"Error analyzing audits: {e}")
        return None

def main():
    print("=== Tomorrow School Audit Analyzer ===")
    
    # Get credentials
    username = input("Enter username/email: ")
    password = input("Enter password: ")
    
    print("\n1. Getting JWT token...")
    jwt = get_jwt_token(username, password)
    if not jwt:
        print("Failed to get JWT token")
        return
    
    print("✓ JWT token obtained")
    
    print("\n2. Parsing JWT payload...")
    payload = parse_jwt_payload(jwt)
    user_id = payload.get('sub') or payload.get('id')
    
    if not user_id:
        print("Failed to extract user ID from JWT")
        return
    
    print(f"✓ User ID: {user_id}")
    
    print("\n3. Analyzing audit data...")
    audits = analyze_audits(jwt, user_id)
    if not audits:
        print("Failed to get audit data")
        return
    
    print(f"✓ Found {len(audits)} audits")
    
    # Analyze the data
    print("\n=== ANALYSIS RESULTS ===")
    
    # Basic statistics
    total_audits = len(audits)
    unique_ids = len(set(audit['id'] for audit in audits))
    duplicates = total_audits - unique_ids
    
    print(f"Total audits: {total_audits}")
    print(f"Unique IDs: {unique_ids}")
    print(f"Duplicates: {duplicates}")
    
    # Grade analysis
    grades = [audit.get('grade') for audit in audits if audit.get('grade') is not None]
    passed = len([g for g in grades if g >= 1])
    failed = len([g for g in grades if g < 1])
    null_grades = len([audit for audit in audits if audit.get('grade') is None])
    
    print(f"\nGrade Analysis:")
    print(f"  Passed (≥1): {passed}")
    print(f"  Failed (<1): {failed}")
    print(f"  Null grades: {null_grades}")
    
    # Result analysis
    with_results = len([audit for audit in audits if audit.get('result')])
    without_results = total_audits - with_results
    
    print(f"\nResult Analysis:")
    print(f"  With results: {with_results}")
    print(f"  Without results: {without_results}")
    
    # Object analysis
    with_objects = len([audit for audit in audits if audit.get('result') and audit.get('result', {}).get('object')])
    with_author_ids = len([audit for audit in audits if audit.get('result') and audit.get('result', {}).get('object', {}).get('authorId')])
    
    print(f"\nObject Analysis:")
    print(f"  With objects: {with_objects}")
    print(f"  With author IDs: {with_author_ids}")
    
    # Date analysis
    dates = [audit.get('createdAt') for audit in audits if audit.get('createdAt')]
    if dates:
        dates.sort()
        earliest = dates[0]
        latest = dates[-1]
        print(f"\nDate Range:")
        print(f"  Earliest: {earliest}")
        print(f"  Latest: {latest}")
    
    # Sample audits
    print(f"\n=== SAMPLE AUDITS (first 10) ===")
    for i, audit in enumerate(audits[:10]):
        result = audit.get('result') or {}
        object_data = result.get('object', {}) if result else {}
        
        print(f"{i+1}. ID: {audit.get('id')}")
        print(f"   Grade: {audit.get('grade')}")
        print(f"   Date: {audit.get('createdAt')}")
        print(f"   Project: {object_data.get('name', 'Unknown')}")
        print(f"   Type: {object_data.get('type', 'Unknown')}")
        print(f"   Author ID: {object_data.get('authorId', 'Unknown')}")
        print(f"   Has Result: {bool(result)}")
        print()
    
    # Save detailed data to file
    with open('audit_analysis.json', 'w') as f:
        json.dump({
            'summary': {
                'total_audits': total_audits,
                'unique_ids': unique_ids,
                'duplicates': duplicates,
                'passed': passed,
                'failed': failed,
                'null_grades': null_grades,
                'with_results': with_results,
                'without_results': without_results,
                'with_objects': with_objects,
                'with_author_ids': with_author_ids
            },
            'audits': audits
        }, f, indent=2)
    
    print(f"✓ Detailed data saved to 'audit_analysis.json'")

if __name__ == "__main__":
    main()
