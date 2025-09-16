#!/usr/bin/env python3
import os
import requests
import json

def load_token():
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('GRAPHQL_TOKEN='):
                    return line.split('=', 1)[1].strip().strip('"')
    except FileNotFoundError:
        print("Файл .env не найден")
        return None

def find_audits_with_valid_results():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Ищем аудиты mshaimard с существующими результатами
    query = """
    query {
        audit(where: {auditor: {login: {_eq: "mshaimard"}}, resultId: {_is_null: false}}, limit: 10, order_by: {createdAt: desc}) {
            id
            resultId
            grade
            createdAt
            result {
                id
                object {
                    name
                    type
                }
                user {
                    login
                }
            }
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 АУДИТЫ MSHAIMARD С СУЩЕСТВУЮЩИМИ РЕЗУЛЬТАТАМИ")
    print(f"{'='*60}")
    
    response = requests.post(
        'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql',
        json={'query': query},
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        if 'errors' in data:
            print("❌ Ошибки GraphQL:")
            for error in data['errors']:
                print(f"   - {error['message']}")
        else:
            audits = data['data']['audit']
            print(f"✅ Найдено {len(audits)} аудитов с существующими результатами")
            
            for i, audit in enumerate(audits, 1):
                print(f"\n--- Аудит #{i} ---")
                print(f"ID: {audit['id']}")
                print(f"ResultId: {audit['resultId']}")
                print(f"Grade: {audit.get('grade', 'N/A')}")
                print(f"Created: {audit['createdAt']}")
                
                if audit.get('result'):
                    result = audit['result']
                    print(f"✅ Project: {result.get('object', {}).get('name', 'N/A')} (тип: {result.get('object', {}).get('type', 'N/A')})")
                    print(f"✅ Author: {result.get('user', {}).get('login', 'N/A')}")
                else:
                    print("❌ Result: null")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    find_audits_with_valid_results()

