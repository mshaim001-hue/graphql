#!/usr/bin/env python3
"""
Скрипт для тестирования таблицы public.progress
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

def test_progress():
    """Тестирует запросы к таблице progress"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для таблицы progress с фильтром по типу "project"
    query = """
    query {
        progress(where: {object: {type: {_eq: "exercise"}}}) {
            id
            userId
            group {
                id
                status
            }
            grade
            createdAt
            updatedAt
            path
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
    print(f"🔍 ТЕСТ PROGRESS (только проекты)")
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
            progress_records = data['data']['progress']
            print(f"✅ Найдено {len(progress_records)} записей progress")
            
            # Сохраняем в файл
            filename = f"progress_data_{len(progress_records)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(progress_records, f, indent=2, ensure_ascii=False)
            
            print(f"📁 Данные сохранены в файл: {filename}")
            print(f"📊 Показаны первые 5 записей:")
            
            # Показываем только первые 5 для краткости
            for i, progress in enumerate(progress_records[:5], 1):
                print(f"\n--- Progress #{i} ---")
                print(f"ID: {progress.get('id', 'N/A')}")
                print(f"UserId: {progress.get('userId', 'N/A')}")
                print(f"GroupId: {progress.get('groupId', 'N/A')}")
                print(f"EventId: {progress.get('eventId', 'N/A')}")
                print(f"Grade: {progress.get('grade', 'N/A')}")
                print(f"Path: {progress.get('path', 'N/A')}")
                print(f"Created: {progress.get('createdAt', 'N/A')}")
                
                if 'object' in progress and progress['object']:
                    obj = progress['object']
                    print(f"Object: {obj.get('name', 'N/A')} (Type: {obj.get('type', 'N/A')})")
            
            if len(progress_records) > 5:
                print(f"\n... и еще {len(progress_records) - 5} записей в файле {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_progress()
