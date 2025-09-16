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

def test_different_queries():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Поиск аудитов пользователя mshaimard
    query4 = """
    query {
        audit(order_by: {createdAt: desc}) {
            id
            group {
                id
                eventId
                captain {
                    id
                    login
                    profile
                }
                status
                path
                campus
            }
            attrs
            grade
            createdAt
            version
            endAt
            auditor {
                id
                login
                profile
                campus
            }
            result {
                id
                object {
                    id
                    name
                    type
                    attrs
                    createdAt
                    updatedAt
                    campus
                }
                grade
                group {
                    id
                    event {
                        id
                        path
                        object {
                            id
                            name
                            type
                            attrs
                            createdAt
                            updatedAt
                            campus
                        }
                    }
                    captainId
                    status
                    path
                    campus
                }
                createdAt
                type
                path
                user {
                    id
                    login
                }
                object {
                    id
                    name
                }
            }
        }
    }
    """
    
    queries = [
        (query4, "ПОЛНЫЙ ЗАПРОС")
    ]
    
    for query, description in queries:
        print(f"\n{'='*60}")
        print(f"🔍 {description}")
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
                print(f"✅ Найдено {len(audits)} аудитов")
                
                # Сохраняем в файл
                filename = f"audit_data_{len(audits)}_items.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(audits, f, indent=2, ensure_ascii=False)
                
                print(f"📁 Данные сохранены в файл: {filename}")
                print(f"📊 Показаны первые 5 аудитов:")
                
                # Показываем только первые 5 для краткости
                for i, audit in enumerate(audits[:5], 1):
                    print(f"\n--- Аудит #{i} ---")
                    print(f"ID: {audit['id']}")
                    print(f"AuditorId: {audit.get('auditorId', 'N/A')}")
                    print(f"ResultId: {audit.get('resultId', 'N/A')}")
                    print(f"Grade: {audit.get('grade', 'N/A')}")
                    print(f"Created: {audit.get('createdAt', 'N/A')}")
                    
                    if 'auditor' in audit:
                        auditor = audit['auditor']
                        if auditor:
                            print(f"Auditor: {auditor.get('login', 'N/A')} (ID: {auditor.get('id', 'N/A')})")
                        else:
                            print("Auditor: null")
                    
                    if 'result' in audit:
                        result = audit['result']
                        if result:
                            print(f"Result ID: {result.get('id', 'N/A')}")
                            print(f"Result Type: {result.get('type', 'N/A')}")
                            print(f"Result Path: {result.get('path', 'N/A')}")
                            if result.get('user'):
                                print(f"Result User: {result['user'].get('login', 'N/A')} (ID: {result['user'].get('id', 'N/A')})")
                            if result.get('object'):
                                print(f"Project: {result['object'].get('name', 'N/A')} (ID: {result['object'].get('id', 'N/A')})")
                        else:
                            print("Result: null")
                
                if len(audits) > 5:
                    print(f"\n... и еще {len(audits) - 5} аудитов в файле {filename}")
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_different_queries()
