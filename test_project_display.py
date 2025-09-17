#!/usr/bin/env python3
"""
Тест для проверки отображения проектов
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

def test_project_display():
    """Тест отображения проектов"""
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
        object(where: {type: {_eq: "project"}, attrs: {_has_key: "language"}, campus: {_eq: "astanahub"}}, order_by: {createdAt: desc}, limit: 10) {
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
    
    print("🔍 Тестируем отображение проектов...")
    
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
            
            print(f"\n📋 Пример отображения проектов:")
            print("=" * 80)
            
            for i, project in enumerate(objects, 1):
                createdAt = project.get('createdAt', 'N/A')
                if createdAt != 'N/A':
                    createdAt = createdAt.split('T')[0]  # Показываем только дату
                
                language = project.get('attrs', {}).get('language', 'Unknown')
                groupMin = project.get('attrs', {}).get('groupMin', 'N/A')
                groupMax = project.get('attrs', {}).get('groupMax', 'N/A')
                groupInfo = f"{groupMin}-{groupMax} people" if groupMin != 'N/A' and groupMax != 'N/A' else 'Individual'
                
                print(f"\n{i}. {project.get('name', 'N/A')}")
                print(f"   Language: {language}")
                print(f"   Group: {groupInfo}")
                print(f"   Created: {createdAt}")
                print("-" * 40)
            
            print(f"\n📊 Статистика:")
            languages = {}
            groupSizes = {}
            
            for project in objects:
                language = project.get('attrs', {}).get('language', 'Unknown')
                languages[language] = languages.get(language, 0) + 1
                
                groupMin = project.get('attrs', {}).get('groupMin')
                groupMax = project.get('attrs', {}).get('groupMax')
                if groupMin and groupMax:
                    groupSize = f"{groupMin}-{groupMax}"
                    groupSizes[groupSize] = groupSizes.get(groupSize, 0) + 1
            
            print(f"\nЯзыки программирования:")
            for lang, count in sorted(languages.items(), key=lambda x: x[1], reverse=True):
                print(f"   {lang}: {count} проектов")
            
            print(f"\nРазмеры групп:")
            for size, count in sorted(groupSizes.items(), key=lambda x: x[1], reverse=True):
                print(f"   {size} people: {count} проектов")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_project_display()