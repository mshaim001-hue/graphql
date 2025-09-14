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

def analyze_audits_full(jwt, user_id):
    """Analyze audit data using GraphQL API with ALL fields"""
    api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
    
    query = """
    query {
        audit(where: {auditorId: {_eq: %s}}) {
            id
            grade
            createdAt
            updatedAt
            groupId
            auditorId
            resultId
            attrs
            version
            endAt
            result {
                id
                userId
                groupId
                objectId
                eventId
                grade
                createdAt
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
    print("=== Tomorrow School FULL Audit Analyzer ===")
    
    # Get credentials
    username = input("Enter username/email: ")
    password = input("Enter password: ")
    
    print("\n1. Getting JWT token...")
    jwt = get_jwt_token(username, password)
    if not jwt:
        print("Failed to get JWT token")
        return
    
    print("✓ JWT token obtained")
    
    print("\n2. Analyzing FULL audit data...")
    audits = analyze_audits_full(jwt, 2058)  # Use known user ID
    if not audits:
        print("Failed to get audit data")
        return
    
    print(f"✓ Found {len(audits)} audits")
    
    # Analyze the data
    print("\n=== FULL ANALYSIS RESULTS ===")
    
    # Basic statistics
    total_audits = len(audits)
    unique_ids = len(set(audit['id'] for audit in audits))
    duplicates = total_audits - unique_ids
    
    print(f"Total audits: {total_audits}")
    print(f"Unique IDs: {unique_ids}")
    print(f"Duplicates: {duplicates}")
    
    # Check all fields
    print(f"\n=== FIELD ANALYSIS ===")
    all_fields = set()
    for audit in audits:
        all_fields.update(audit.keys())
    
    print(f"All fields in audits: {sorted(all_fields)}")
    
    # Check specific fields
    fields_to_check = ['resultId', 'groupId', 'auditorId', 'attrs', 'version', 'endAt', 'updatedAt']
    for field in fields_to_check:
        count = len([a for a in audits if field in a and a[field] is not None])
        print(f"{field}: {count} аудитов")
    
    # Result analysis
    with_results = len([audit for audit in audits if audit.get('result')])
    without_results = total_audits - with_results
    
    print(f"\nResult Analysis:")
    print(f"  With results: {with_results}")
    print(f"  Without results: {without_results}")
    
    # Check resultId vs result
    with_result_id = len([audit for audit in audits if audit.get('resultId')])
    print(f"  With resultId: {with_result_id}")
    
    # Grade analysis
    grades = [audit.get('grade') for audit in audits if audit.get('grade') is not None]
    passed = len([g for g in grades if g >= 1])
    failed = len([g for g in grades if g < 1])
    null_grades = len([audit for audit in audits if audit.get('grade') is None])
    
    print(f"\nGrade Analysis:")
    print(f"  Passed (≥1): {passed}")
    print(f"  Failed (<1): {failed}")
    print(f"  Null grades: {null_grades}")
    
    # Sample audits with full data
    print(f"\n=== SAMPLE AUDITS (first 5) ===")
    for i, audit in enumerate(audits[:5]):
        print(f"{i+1}. ID: {audit.get('id')}")
        print(f"   Grade: {audit.get('grade')}")
        print(f"   Date: {audit.get('createdAt')}")
        print(f"   resultId: {audit.get('resultId')}")
        print(f"   groupId: {audit.get('groupId')}")
        print(f"   auditorId: {audit.get('auditorId')}")
        print(f"   Has result: {bool(audit.get('result'))}")
        if audit.get('result'):
            result = audit['result']
            print(f"   Result ID: {result.get('id')}")
            print(f"   Result objectId: {result.get('objectId')}")
            print(f"   Result userId: {result.get('userId')}")
        print()
    
    # Save detailed data to file
    with open('audit_analysis_full.json', 'w') as f:
        json.dump({
            'summary': {
                'total_audits': total_audits,
                'unique_ids': unique_ids,
                'duplicates': duplicates,
                'with_results': with_results,
                'without_results': without_results,
                'with_result_id': with_result_id,
                'passed': passed,
                'failed': failed,
                'null_grades': null_grades
            },
            'audits': audits
        }, f, indent=2)
    
    print(f"✓ Detailed data saved to 'audit_analysis_full.json'")

if __name__ == "__main__":
    main()
