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

def test_record():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Тест 1: Простой запрос record
    query1 = """
    query {
        record {
            id
            user {
                id
                login
            }
            authorId
            message
            createdAt
        }
    }
    """
    
    queries = [
        (query1, "ПРОСТОЙ ЗАПРОС record")
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
                records = data['data']['record']
                print(f"✅ Найдено {len(records)} записей record")
                
                # Сохраняем в файл
                filename = f"record_data_{len(records)}_items.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(records, f, indent=2, ensure_ascii=False)
                
                print(f"📁 Данные сохранены в файл: {filename}")
                print(f"📊 Показаны первые 5 записей:")
                
                # Показываем только первые 5 для краткости
                for i, record in enumerate(records[:5], 1):
                    print(f"\n--- Record #{i} ---")
                    print(f"ID: {record.get('id', 'N/A')}")
                    print(f"UserId: {record.get('userId', 'N/A')}")
                    print(f"AuthorId: {record.get('authorId', 'N/A')}")
                    print(f"Message: {record.get('message', 'N/A')[:100]}...")  # Показываем первые 100 символов
                    
                    if 'user' in record and record['user']:
                        user = record['user']
                        print(f"User: {user.get('login', 'N/A')} (ID: {user.get('id', 'N/A')})")
                        print(f"User Profile: {user.get('profile', 'N/A')}")
                        if 'campus' in user:
                            print(f"User Campus: {user.get('campus', 'N/A')}")
                    
                    if 'author' in record and record['author']:
                        author = record['author']
                        print(f"Author: {author.get('login', 'N/A')} (ID: {author.get('id', 'N/A')})")
                        print(f"Author Profile: {author.get('profile', 'N/A')}")
                        if 'campus' in author:
                            print(f"Author Campus: {author.get('campus', 'N/A')}")
                
                if len(records) > 5:
                    print(f"\n... и еще {len(records) - 5} записей в файле {filename}")
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_record()
