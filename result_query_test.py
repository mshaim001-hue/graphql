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

def test_different_approaches():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Подход 4: Полная структура result
    query4 = """
    query {
        result(order_by: {createdAt: desc}) {
            attrs
        }
    }
    """
    
    queries = [
        (query4, "ПОЛНАЯ СТРУКТУРА RESULT")
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
                results = data['data']['result']
                print(f"✅ Найдено {len(results)} результатов")
                
                # Сохраняем в файл
                filename = f"result_data_{len(results)}_items.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)
                
                print(f"📁 Данные сохранены в файл: {filename}")
                print(f"📊 Показаны первые 3 результата:")
                
                # Показываем только первые 3 для краткости
                for i, result in enumerate(results[:3], 1):
                    print(f"\n--- Результат #{i} ---")
                    print(f"ID: {result.get('id', 'N/A')}")
                    print(f"UserId: {result.get('userId', 'N/A')}")
                    print(f"ObjectId: {result.get('objectId', 'N/A')}")
                    print(f"Grade: {result.get('grade', 'N/A')}")
                    print(f"Created: {result.get('createdAt', 'N/A')}")
                    print(f"Type: {result.get('type', 'N/A')}")
                    print(f"Path: {result.get('path', 'N/A')}")
                
                if len(results) > 3:
                    print(f"\n... и еще {len(results) - 3} результатов в файле {filename}")
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_different_approaches()
