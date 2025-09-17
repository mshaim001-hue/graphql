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

def test_transaction():
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    query = """
    query {
        transaction {
            id
            type
            amount
            user {
                id
                login
                profile
                campus
            }
            attrs
            path
            event {
                path
            }
            object {
                id
                name
                type
                attrs
                createdAt
                updatedAt
                campus
            }
            createdAt
        }
    }
    """
    
    print("🔍 ТЕСТ TRANSACTION")
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
            transactions = data['data']['transaction']
            print(f"✅ Найдено {len(transactions)} записей transaction")
            
            # Сохраняем в файл
            filename = f"transaction_data_{len(transactions)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(transactions, f, indent=2, ensure_ascii=False)
            
            print(f"📁 Данные сохранены в файл: {filename}")
            print(f"📊 Показаны первые 5 записей:")
            
            # Показываем только первые 5 для краткости
            for i, transaction in enumerate(transactions[:5], 1):
                print(f"\n--- Transaction #{i} ---")
                print(f"ID: {transaction.get('id', 'N/A')}")
                print(f"Type: {transaction.get('type', 'N/A')}")
                print(f"Amount: {transaction.get('amount', 'N/A')}")
                print(f"UserId: {transaction.get('userId', 'N/A')}")
                print(f"Path: {transaction.get('path', 'N/A')}")
                print(f"Created: {transaction.get('createdAt', 'N/A')}")
            
            if len(transactions) > 5:
                print(f"\n... и еще {len(transactions) - 5} записей в файле {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_transaction()
