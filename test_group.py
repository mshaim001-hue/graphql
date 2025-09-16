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

def test_group():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    query = """
    query {
        group(order_by: {createdAt: desc}) {
            id
            event {
                id
                path
                object {
                    id
                    name
                    type
                }
            }
            createdAt
            updatedAt
            status
            path
            object {
                name
            }
        }
    }
    """
    
    print("🔍 ТЕСТ GROUP")
    print("="*60)
    
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
            groups = data['data']['group']
            print(f"✅ Найдено {len(groups)} записей group")
            
            # Сохраняем в файл
            filename = f"group_data_{len(groups)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(groups, f, indent=2, ensure_ascii=False)
            
            print(f"📁 Данные сохранены в файл: {filename}")
            print(f"📊 Показаны первые 5 записей:")
            
            # Показываем только первые 5 для краткости
            for i, group in enumerate(groups[:5], 1):
                print(f"\n--- Group #{i} ---")
                print(f"ID: {group.get('id', 'N/A')}")
                print(f"EventId: {group.get('eventId', 'N/A')}")
                print(f"Status: {group.get('status', 'N/A')}")
                print(f"Path: {group.get('path', 'N/A')}")
                print(f"ObjectId: {group.get('objectId', 'N/A')}")
                print(f"Created: {group.get('createdAt', 'N/A')}")
                print(f"Updated: {group.get('updatedAt', 'N/A')}")
            
            if len(groups) > 5:
                print(f"\n... и еще {len(groups) - 5} записей в файле {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_group()
