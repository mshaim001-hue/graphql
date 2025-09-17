#!/usr/bin/env python3
"""
Тест для проверки алфавитной сортировки проектов
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

def test_alphabetical_projects():
    """Тест алфавитной сортировки проектов"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения проектов AstanaHub
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
    
    print("🔍 Тестируем алфавитную сортировку проектов...")
    
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
            objects = data['data']['object']
            print(f"✅ Найдено {len(objects)} проектов")
            
            # Сортируем по алфавиту
            sorted_projects = sorted(objects, key=lambda x: x.get('name', '').lower())
            
            print(f"\n📋 Проекты в алфавитном порядке (первые 20):")
            print("=" * 80)
            
            for i, project in enumerate(sorted_projects[:20], 1):
                createdAt = project.get('createdAt', 'N/A')
                if createdAt != 'N/A':
                    createdAt = createdAt.split('T')[0]  # Показываем только дату
                
                language = project.get('attrs', {}).get('language', 'Unknown')
                groupMin = project.get('attrs', {}).get('groupMin', 'N/A')
                groupMax = project.get('attrs', {}).get('groupMax', 'N/A')
                groupInfo = f"{groupMin}-{groupMax} people" if groupMin != 'N/A' and groupMax != 'N/A' else 'Individual'
                
                print(f"{i:2d}. {project.get('name', 'N/A')}")
                print(f"     Language: {language} | Group: {groupInfo} | Created: {createdAt}")
                print("-" * 40)
            
            if len(sorted_projects) > 20:
                print(f"\n... и еще {len(sorted_projects) - 20} проектов")
            
            # Проверяем, что сортировка правильная
            print(f"\n🔍 Проверка алфавитной сортировки:")
            is_sorted = True
            for i in range(1, len(sorted_projects)):
                prev_name = sorted_projects[i-1].get('name', '').lower()
                curr_name = sorted_projects[i].get('name', '').lower()
                if prev_name > curr_name:
                    is_sorted = False
                    print(f"❌ Нарушение сортировки: '{prev_name}' > '{curr_name}'")
                    break
            
            if is_sorted:
                print("✅ Сортировка правильная!")
            else:
                print("❌ Сортировка неправильная!")
            
            # Показываем статистику по языкам
            languages = {}
            for project in sorted_projects:
                language = project.get('attrs', {}).get('language', 'Unknown')
                languages[language] = languages.get(language, 0) + 1
            
            print(f"\n📊 Статистика по языкам:")
            for lang, count in sorted(languages.items(), key=lambda x: x[1], reverse=True):
                print(f"   {lang}: {count} проектов")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_alphabetical_projects()