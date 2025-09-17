#!/usr/bin/env python3
"""
Тест для проверки запроса всех проектов
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

def test_all_projects_query():
    """Тест запроса всех проектов"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения всех проектов с языком программирования из кампуса astanahub
    query = """
    query {
        object(where: {type: {_eq: "project"}, attrs: {_has_key: "language"}, campus: {_eq: "astanahub"}}, order_by: {createdAt: desc}) {
            id
            name
            type
            attrs
            createdAt
            updatedAt
            campus
            authorId
        }
    }
    """
    
    print("🔍 Тестируем запрос всех проектов...")
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
            print(f"✅ Успешно! Найдено {len(objects)} проектов")
            
            # Анализируем языки программирования
            languages = {}
            campuses = {}
            
            for obj in objects:
                language = obj.get('attrs', {}).get('language', 'Unknown')
                campus = obj.get('campus', 'None')
                
                languages[language] = languages.get(language, 0) + 1
                campuses[campus] = campuses.get(campus, 0) + 1
            
            print(f"\n📊 Распределение по языкам:")
            for lang, count in sorted(languages.items(), key=lambda x: x[1], reverse=True):
                print(f"   {lang}: {count} проектов")
            
            print(f"\n🏫 Распределение по кампусам:")
            for campus, count in sorted(campuses.items(), key=lambda x: x[1], reverse=True):
                print(f"   {campus}: {count} проектов")
            
            # Показываем первые 5 проектов
            print(f"\n📋 Первые 5 проектов:")
            for i, obj in enumerate(objects[:5], 1):
                print(f"\n{i}. {obj.get('name', 'N/A')}")
                print(f"   ID: {obj.get('id', 'N/A')}")
                print(f"   Language: {obj.get('attrs', {}).get('language', 'N/A')}")
                print(f"   Campus: {obj.get('campus', 'N/A')}")
                print(f"   Created: {obj.get('createdAt', 'N/A')}")
                
                # Показываем информацию о группе
                attrs = obj.get('attrs', {})
                if 'groupMin' in attrs and 'groupMax' in attrs:
                    print(f"   Group: {attrs['groupMin']}-{attrs['groupMax']} people")
            
            # Сохраняем результат
            filename = f"all_projects_test_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Результат сохранен в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")
        print(f"Ответ: {response.text}")

if __name__ == "__main__":
    test_all_projects_query()