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

def test_user_role():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Тест 1: Простой запрос role
    query1 = """
    query {
        role {
            id
            name
            description
            slug
        }
    }
    """
    
    queries = [
        (query1, "ПРОСТОЙ ЗАПРОС role")
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
                roles = data['data']['role']
                print(f"✅ Найдено {len(roles)} записей role")
                
                # Сохраняем в файл
                filename = f"role_data_{len(roles)}_items.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(roles, f, indent=2, ensure_ascii=False)
                
                print(f"📁 Данные сохранены в файл: {filename}")
                print(f"📊 Показаны первые 5 записей:")
                
                # Показываем только первые 5 для краткости
                for i, role in enumerate(roles[:5], 1):
                    print(f"\n--- Role #{i} ---")
                    print(f"ID: {role.get('id', 'N/A')}")
                    print(f"Name: {role.get('name', 'N/A')}")
                    print(f"Description: {role.get('description', 'N/A')}")
                
                if len(roles) > 5:
                    print(f"\n... и еще {len(roles) - 5} записей в файле {filename}")
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_user_role()
