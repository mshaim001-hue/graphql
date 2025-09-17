#!/usr/bin/env python3
"""
Тест для таблицы public.match
"""

import os
import json
import requests
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def get_jwt_token():
    """Получить JWT токен из .env файла"""
    token = os.getenv('GRAPHQL_TOKEN')
    if not token:
        raise ValueError("GRAPHQL_TOKEN не найден в .env файле")
    return token

def make_graphql_query(query, token):
    """Выполнить GraphQL запрос"""
    url = "https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql"
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, json={'query': query}, headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"HTTP error! status: {response.status_code}")
    
    data = response.json()
    
    if 'errors' in data:
        raise Exception(f"GraphQL errors: {data['errors']}")
    
    return data['data']

def main():
    try:
        # Получаем JWT токен
        token = get_jwt_token()
        print(f"✅ JWT токен получен")
        
        # Запрос для таблицы match с фильтром по проектам
        query = """
        query {
            match(where: {object: {type: {_eq: "project"}}}) {
                id
                userId
                eventId
                createdAt
                updatedAt
                matchId
                confirmed
                bet
                result
                path
                campus
                object {
                    id
                    name
                    type
                    attrs
                }
            }
        }
        """
        
        print(f"\n{'='*60}")
        print(f"🔍 ТЕСТ MATCH (только проекты)")
        print(f"{'='*60}")
        
        # Выполняем запрос
        print("Выполняем GraphQL запрос...")
        data = make_graphql_query(query, token)
        
        matches = data.get('match', [])
        print(f"✅ Найдено {len(matches)} записей match")
        
        # Сохраняем данные в файл
        filename = f"match_data_{len(matches)}_items.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(matches, f, indent=2, ensure_ascii=False)
        print(f"📁 Данные сохранены в файл: {filename}")
        
        # Показываем первые 5 записей
        print(f"\n📊 Показаны первые 5 записей:")
        for i, match in enumerate(matches[:5]):
            print(f"\n--- Match #{i+1} ---")
            print(f"ID: {match.get('id', 'N/A')}")
            print(f"UserId: {match.get('userId', 'N/A')}")
            print(f"EventId: {match.get('eventId', 'N/A')}")
            print(f"MatchId: {match.get('matchId', 'N/A')}")
            print(f"Confirmed: {match.get('confirmed', 'N/A')}")
            print(f"Bet: {match.get('bet', 'N/A')}")
            print(f"Result: {match.get('result', 'N/A')}")
            print(f"Path: {match.get('path', 'N/A')}")
            print(f"Campus: {match.get('campus', 'N/A')}")
            
            # Информация об объекте
            object_info = match.get('object', {})
            if object_info:
                print(f"Object: {object_info.get('name', 'N/A')} (Type: {object_info.get('type', 'N/A')})")
            else:
                print(f"Object: N/A")
            
            print(f"Created: {match.get('createdAt', 'N/A')}")
            print(f"Updated: {match.get('updatedAt', 'N/A')}")
        
        if len(matches) > 5:
            print(f"\n... и еще {len(matches) - 5} записей в файле {filename}")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main()
