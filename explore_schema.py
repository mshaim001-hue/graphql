#!/usr/bin/env python3
"""
Скрипт для исследования схемы GraphQL API Tomorrow School
"""

import requests
import json
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def make_graphql_request(query, description=""):
    """Выполнить GraphQL запрос"""
    api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
    token = os.getenv('GRAPHQL_TOKEN')
    
    if not token:
        print("❌ GRAPHQL_TOKEN не найден в .env файле")
        return None
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    payload = {
        'query': query
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()
        
        if 'errors' in data:
            print(f"❌ GraphQL ошибки: {data['errors']}")
            return None
        
        return data.get('data', {})
        
    except Exception as e:
        print(f"❌ Ошибка запроса: {e}")
        return None

def explore_schema():
    """Исследовать схему GraphQL"""
    print("🔍 Исследование схемы GraphQL API Tomorrow School")
    print("=" * 60)
    
    # 1. Получить доступные поля в корне запросов
    print("\n1. Доступные поля в корне запросов:")
    query = """
    query {
        __schema {
            queryType {
                fields {
                    name
                    description
                    type {
                        name
                        kind
                    }
                }
            }
        }
    }
    """
    
    data = make_graphql_request(query)
    if data and '__schema' in data:
        fields = data['__schema']['queryType']['fields']
        for field in fields:
            print(f"  - {field['name']}: {field['type']['name']} ({field['type']['kind']})")
            if field.get('description'):
                print(f"    {field['description']}")
    
    # 2. Получить информацию о типе audit
    print("\n2. Поля типа 'audit':")
    query = """
    query {
        __type(name: "audit") {
            fields {
                name
                description
                type {
                    name
                    kind
                }
            }
        }
    }
    """
    
    data = make_graphql_request(query)
    if data and '__type' in data and data['__type']:
        fields = data['__type']['fields']
        for field in fields:
            print(f"  - {field['name']}: {field['type']['name']} ({field['type']['kind']})")
            if field.get('description'):
                print(f"    {field['description']}")
    else:
        print("  ❌ Тип 'audit' не найден")
    
    # 3. Получить информацию о типе result
    print("\n3. Поля типа 'result':")
    query = """
    query {
        __type(name: "result") {
            fields {
                name
                description
                type {
                    name
                    kind
                }
            }
        }
    }
    """
    
    data = make_graphql_request(query)
    if data and '__type' in data and data['__type']:
        fields = data['__type']['fields']
        for field in fields:
            print(f"  - {field['name']}: {field['type']['name']} ({field['type']['kind']})")
            if field.get('description'):
                print(f"    {field['description']}")
    else:
        print("  ❌ Тип 'result' не найден")
    
    # 4. Получить информацию о типе object
    print("\n4. Поля типа 'object':")
    query = """
    query {
        __type(name: "object") {
            fields {
                name
                description
                type {
                    name
                    kind
                }
            }
        }
    }
    """
    
    data = make_graphql_request(query)
    if data and '__type' in data and data['__type']:
        fields = data['__type']['fields']
        for field in fields:
            print(f"  - {field['name']}: {field['type']['name']} ({field['type']['kind']})")
            if field.get('description'):
                print(f"    {field['description']}")
    else:
        print("  ❌ Тип 'object' не найден")
    
    # 5. Получить информацию о типе user
    print("\n5. Поля типа 'user':")
    query = """
    query {
        __type(name: "user") {
            fields {
                name
                description
                type {
                    name
                    kind
                }
            }
        }
    }
    """
    
    data = make_graphql_request(query)
    if data and '__type' in data and data['__type']:
        fields = data['__type']['fields']
        for field in fields:
            print(f"  - {field['name']}: {field['type']['name']} ({field['type']['kind']})")
            if field.get('description'):
                print(f"    {field['description']}")
    else:
        print("  ❌ Тип 'user' не найден")

def test_simple_queries():
    """Протестировать простые запросы"""
    print("\n🧪 Тестирование простых запросов:")
    print("=" * 40)
    
    # Попробуем разные варианты запросов
    test_queries = [
        ("Попытка 1: user", "query { user { id } }"),
        ("Попытка 2: users", "query { users { id } }"),
        ("Попытка 3: audit", "query { audit { id } }"),
        ("Попытка 4: audits", "query { audits { id } }"),
        ("Попытка 5: result", "query { result { id } }"),
        ("Попытка 6: results", "query { results { id } }"),
        ("Попытка 7: object", "query { object { id } }"),
        ("Попытка 8: objects", "query { objects { id } }"),
    ]
    
    for description, query in test_queries:
        print(f"\n{description}:")
        data = make_graphql_request(query)
        if data:
            print(f"  ✅ Успех: {list(data.keys())}")
        else:
            print("  ❌ Не удалось")

if __name__ == "__main__":
    explore_schema()
    test_simple_queries()
