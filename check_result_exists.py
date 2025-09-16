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

def check_specific_results():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Проверим несколько конкретных resultId из аудитов
    result_ids = [240932, 222723, 209551, 202043, 200411]
    
    for result_id in result_ids:
        query = f"""
        query {{
            result(where: {{id: {{_eq: {result_id}}}}}) {{
                id
                userId
                objectId
                grade
                object {{
                    id
                    name
                    type
                }}
                user {{
                    id
                    login
                }}
            }}
        }}
        """
        
        print(f"\n{'='*50}")
        print(f"🔍 Проверяем resultId: {result_id}")
        print(f"{'='*50}")
        
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
                results = data['data']['result']
                if results and len(results) > 0:
                    result = results[0]
                    print(f"✅ Результат найден:")
                    print(f"   ID: {result['id']}")
                    print(f"   UserId: {result.get('userId', 'N/A')}")
                    print(f"   ObjectId: {result.get('objectId', 'N/A')}")
                    print(f"   Grade: {result.get('grade', 'N/A')}")
                    
                    if result.get('object'):
                        print(f"   Project: {result['object'].get('name', 'N/A')} (тип: {result['object'].get('type', 'N/A')})")
                    else:
                        print("   Project: null")
                    
                    if result.get('user'):
                        print(f"   Author: {result['user'].get('login', 'N/A')} (ID: {result['user'].get('id', 'N/A')})")
                    else:
                        print("   Author: null")
                else:
                    print("❌ Результат НЕ найден - запись удалена!")
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")

def check_audit_with_direct_result():
    """Проверим аудит с прямым запросом result"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Возьмем первый аудит и проверим его resultId напрямую
    query = """
    query {
        audit(where: {auditor: {login: {_eq: "mshaimard"}}}, limit: 1, order_by: {createdAt: desc}) {
            id
            resultId
            grade
            createdAt
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ПРОВЕРЯЕМ ПЕРВЫЙ АУДИТ И ЕГО RESULT")
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
            if audits and len(audits) > 0:
                audit = audits[0]
                result_id = audit['resultId']
                print(f"Аудит ID: {audit['id']}")
                print(f"ResultId: {result_id}")
                print(f"Grade: {audit.get('grade', 'N/A')}")
                
                if result_id:
                    # Теперь проверим этот resultId отдельно
                    result_query = f"""
                    query {{
                        result(where: {{id: {{_eq: {result_id}}}}}) {{
                            id
                            object {{
                                name
                                type
                            }}
                            user {{
                                login
                            }}
                        }}
                    }}
                    """
                    
                    result_response = requests.post(
                        'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql',
                        json={'query': result_query},
                        headers=headers
                    )
                    
                    if result_response.status_code == 200:
                        result_data = result_response.json()
                        if 'errors' in result_data:
                            print("❌ Ошибки при запросе result:")
                            for error in result_data['errors']:
                                print(f"   - {error['message']}")
                        else:
                            results = result_data['data']['result']
                            if results and len(results) > 0:
                                result = results[0]
                                print(f"✅ Result найден:")
                                print(f"   Project: {result.get('object', {}).get('name', 'N/A')}")
                                print(f"   Author: {result.get('user', {}).get('login', 'N/A')}")
                            else:
                                print("❌ Result НЕ найден - запись удалена!")
                else:
                    print("❌ ResultId равен null")
            else:
                print("❌ Аудиты не найдены")

if __name__ == "__main__":
    check_specific_results()
    check_audit_with_direct_result()

