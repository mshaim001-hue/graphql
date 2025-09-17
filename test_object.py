#!/usr/bin/env python3
"""
Скрипт для исследования таблицы public.object
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

def test_objects_basic():
    """Базовый тест объектов - получаем все объекты"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Базовый запрос для получения всех объектов
    query = """
    query {
        object(order_by: {createdAt: desc}) {
            id
            name
            type
            attrs
            childrenAttrs
            createdAt
            updatedAt
            campus
            authorId
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ТЕСТ OBJECTS (базовый запрос)")
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
            objects = data['data']['object']
            print(f"✅ Найдено {len(objects)} объектов")
            
            # Сохраняем в файл
            filename = f"object_data_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"📁 Данные сохранены в файл: {filename}")
            print(f"📊 Показаны первые 10 объектов:")
            
            # Показываем первые 10 объектов
            for i, obj in enumerate(objects[:10], 1):
                print(f"\n--- Object #{i} ---")
                print(f"ID: {obj.get('id', 'N/A')}")
                print(f"Name: {obj.get('name', 'N/A')}")
                print(f"Type: {obj.get('type', 'N/A')}")
                print(f"Campus: {obj.get('campus', 'N/A')}")
                print(f"AuthorId: {obj.get('authorId', 'N/A')}")
                print(f"Created: {obj.get('createdAt', 'N/A')}")
                
                # Показываем attrs если они есть
                attrs = obj.get('attrs', {})
                if attrs:
                    print(f"Attrs: {json.dumps(attrs, indent=2)}")
                else:
                    print("Attrs: {}")
            
            if len(objects) > 10:
                print(f"\n... и еще {len(objects) - 10} объектов в файле {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

def test_objects_by_type():
    """Тест объектов по типам"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения объектов по типам
    query = """
    query {
        object(where: {type: {_in: ["project", "exercise", "administration", "checkpoint"]}}, limit: 50) {
            id
            name
            type
            attrs
            createdAt
            campus
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ТЕСТ OBJECTS (по типам)")
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
            objects = data['data']['object']
            print(f"✅ Найдено {len(objects)} объектов")
            
            # Группируем по типам
            by_type = {}
            for obj in objects:
                obj_type = obj.get('type', 'unknown')
                if obj_type not in by_type:
                    by_type[obj_type] = []
                by_type[obj_type].append(obj)
            
            print(f"\n📊 Распределение по типам:")
            for obj_type, type_objects in by_type.items():
                print(f"  {obj_type}: {len(type_objects)} объектов")
                
                # Показываем первые 3 объекта каждого типа
                for i, obj in enumerate(type_objects[:3], 1):
                    print(f"    {i}. {obj.get('name', 'N/A')} (ID: {obj.get('id', 'N/A')})")
                
                if len(type_objects) > 3:
                    print(f"    ... и еще {len(type_objects) - 3} объектов")
            
            # Сохраняем в файл
            filename = f"object_by_type_data_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Данные сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

def test_objects_with_attrs():
    """Тест объектов с атрибутами"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения объектов с непустыми атрибутами
    query = """
    query {
        object(where: {attrs: {_is_null: false}}, limit: 30) {
            id
            name
            type
            attrs
            createdAt
            campus
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ТЕСТ OBJECTS (с атрибутами)")
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
            objects = data['data']['object']
            print(f"✅ Найдено {len(objects)} объектов с атрибутами")
            
            # Показываем объекты с атрибутами
            for i, obj in enumerate(objects[:10], 1):
                print(f"\n--- Object #{i} ---")
                print(f"ID: {obj.get('id', 'N/A')}")
                print(f"Name: {obj.get('name', 'N/A')}")
                print(f"Type: {obj.get('type', 'N/A')}")
                print(f"Campus: {obj.get('campus', 'N/A')}")
                
                # Показываем атрибуты
                attrs = obj.get('attrs', {})
                if attrs:
                    print(f"Attrs:")
                    for key, value in attrs.items():
                        print(f"  {key}: {value}")
                else:
                    print("Attrs: {}")
            
            if len(objects) > 10:
                print(f"\n... и еще {len(objects) - 10} объектов в файле")
            
            # Сохраняем в файл
            filename = f"object_with_attrs_data_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Данные сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

def test_objects_search():
    """Тест поиска объектов по имени"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Поиск объектов по имени (например, содержащих "checkpoint")
    query = """
    query {
        object(where: {name: {_ilike: "%checkpoint%"}}, limit: 20) {
            id
            name
            type
            attrs
            createdAt
            campus
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ТЕСТ OBJECTS (поиск по имени)")
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
            objects = data['data']['object']
            print(f"✅ Найдено {len(objects)} объектов с 'checkpoint' в имени")
            
            # Показываем найденные объекты
            for i, obj in enumerate(objects, 1):
                print(f"\n--- Object #{i} ---")
                print(f"ID: {obj.get('id', 'N/A')}")
                print(f"Name: {obj.get('name', 'N/A')}")
                print(f"Type: {obj.get('type', 'N/A')}")
                print(f"Campus: {obj.get('campus', 'N/A')}")
                print(f"Created: {obj.get('createdAt', 'N/A')}")
            
            # Сохраняем в файл
            filename = f"object_search_checkpoint_data_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Данные сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    print("🚀 Запуск тестов для исследования public.object")
    
    # Запускаем все тесты
    test_objects_basic()
    test_objects_by_type()
    test_objects_with_attrs()
    test_objects_search()
    
    print(f"\n{'='*60}")
    print("✅ Все тесты завершены!")
    print(f"{'='*60}")