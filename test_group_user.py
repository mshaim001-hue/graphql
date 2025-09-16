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

def test_group_user():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    query = """
    query {
        group_user {
            id
            user {
                id
                login
                profile
            }
            group {
                id
                event {
                    id
                    path
                    object {
                        id
                        name
                        type
                        author {
                            id
                            login
                        }
                    }
                }
                createdAt
                updatedAt
                status
                path
                objectId
                campus
            }
        }
    }
    """
    
    print("🔍 ТЕСТ GROUP_USER")
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
            group_users = data['data']['group_user']
            print(f"✅ Найдено {len(group_users)} записей group_user")
            
            # Сохраняем в файл
            filename = f"group_user_data_{len(group_users)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(group_users, f, indent=2, ensure_ascii=False)
            
            print(f"📁 Данные сохранены в файл: {filename}")
            print(f"📊 Показаны первые 5 записей:")
            
            # Показываем только первые 5 для краткости
            for i, group_user in enumerate(group_users[:5], 1):
                print(f"\n--- Group User #{i} ---")
                print(f"ID: {group_user.get('id', 'N/A')}")
                
                if 'user' in group_user and group_user['user']:
                    user = group_user['user']
                    print(f"User: {user.get('login', 'N/A')} (ID: {user.get('id', 'N/A')})")
                    print(f"User Profile: {user.get('profile', 'N/A')}")
                
                if 'group' in group_user and group_user['group']:
                    group = group_user['group']
                    print(f"Group ID: {group.get('id', 'N/A')}")
                    print(f"Group Status: {group.get('status', 'N/A')}")
                    print(f"Group Path: {group.get('path', 'N/A')}")
                    print(f"Group Campus: {group.get('campus', 'N/A')}")
                    print(f"Group Created: {group.get('createdAt', 'N/A')}")
            
            if len(group_users) > 5:
                print(f"\n... и еще {len(group_users) - 5} записей в файле {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_group_user()
