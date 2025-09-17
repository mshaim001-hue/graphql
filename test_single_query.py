#!/usr/bin/env python3
"""
Простой тест для одного GraphQL запроса
"""

import requests
import json
import os

def load_token():
    """Загружает JWT токен из .env файла"""
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('GRAPHQL_TOKEN='):
                    return line.split('=', 1)[1].strip().strip('"')
    except FileNotFoundError:
        print("Файл .env не найден")
        return None

def test_single_query():
    """Тест одного GraphQL запроса"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Ваш запрос
    query = """
    query {
        object(order_by: {createdAt: desc}) {
            id
            name
            type
            attrs
        }
    }
    """
    
    print("🔍 Тестируем GraphQL запрос...")
    print(f"Запрос: {query.strip()}")
    print("-" * 60)
    
    response = requests.post(
        'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql',
        json={'query': query},
        headers=headers
    )
    
    print(f"HTTP статус: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        if 'errors' in data:
            print("❌ Ошибки GraphQL:")
            for error in data['errors']:
                print(f"   - {error['message']}")
        else:
            objects = data['data']['object']
            print(f"✅ Успешно! Найдено {len(objects)} объектов")
            
            # Показываем первые 3 объекта
            print("\n📊 Первые 3 объекта:")
            for i, obj in enumerate(objects[:3], 1):
                print(f"\n--- Object #{i} ---")
                print(f"ID: {obj.get('id', 'N/A')}")
                print(f"Name: {obj.get('name', 'N/A')}")
                print(f"Type: {obj.get('type', 'N/A')}")
                print(f"Campus: {obj.get('campus', 'N/A')}")
                print(f"AuthorId: {obj.get('authorId', 'N/A')}")
                print(f"Created: {obj.get('createdAt', 'N/A')}")
                
                # Показываем attrs
                attrs = obj.get('attrs', {})
                if attrs:
                    print(f"Attrs keys: {list(attrs.keys())}")
                else:
                    print("Attrs: {}")
                
            
            # Сохраняем результат
            filename = f"single_query_result_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Результат сохранен в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")
        print(f"Ответ: {response.text}")

if __name__ == "__main__":
    test_single_query()