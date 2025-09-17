#!/usr/bin/env python3
"""
Скрипт для поиска и фильтрации объектов в public.object
Исправленные запросы для поиска по атрибутам
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

def search_objects_by_language():
    """Поиск объектов по языку программирования"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Исправленный запрос для поиска по языку
    query = """
    query {
        object(where: {attrs: {_contains: {"language": "java"}}}, limit: 20) {
            id
            name
            type
            attrs
            campus
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ПОИСК ОБЪЕКТОВ ПО ЯЗЫКУ: JAVA")
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
            print(f"✅ Найдено {len(objects)} объектов с языком Java")
            
            for i, obj in enumerate(objects[:10], 1):
                print(f"\n{i}. {obj.get('name', 'N/A')} ({obj.get('type', 'N/A')})")
                print(f"   Campus: {obj.get('campus', 'N/A')}")
                attrs = obj.get('attrs', {})
                if 'language' in attrs:
                    print(f"   Language: {attrs['language']}")
                if 'expectedFiles' in attrs:
                    print(f"   Files: {attrs['expectedFiles']}")
            
            if len(objects) > 10:
                print(f"\n... и еще {len(objects) - 10} объектов")
            
            # Сохраняем результаты
            filename = f"object_java_search_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Результаты сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

def search_objects_by_type_and_attrs():
    """Поиск объектов по типу и атрибутам"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Поиск проектов с групповой работой
    query = """
    query {
        object(where: {type: {_eq: "project"}, attrs: {_contains: {"groupMax": 3}}}, limit: 20) {
            id
            name
            type
            attrs
            campus
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ПОИСК ПРОЕКТОВ С ГРУППОВОЙ РАБОТОЙ (groupMax: 3)")
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
            print(f"✅ Найдено {len(objects)} проектов с groupMax: 3")
            
            for i, obj in enumerate(objects, 1):
                print(f"\n{i}. {obj.get('name', 'N/A')}")
                print(f"   Campus: {obj.get('campus', 'N/A')}")
                attrs = obj.get('attrs', {})
                if 'groupMax' in attrs:
                    print(f"   Group Max: {attrs['groupMax']}")
                if 'groupMin' in attrs:
                    print(f"   Group Min: {attrs['groupMin']}")
                if 'language' in attrs:
                    print(f"   Language: {attrs['language']}")
            
            # Сохраняем результаты
            filename = f"object_projects_group3_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Результаты сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

def search_objects_by_validation_type():
    """Поиск объектов по типу валидации"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Поиск объектов с тестером
    query = """
    query {
        object(where: {attrs: {_contains: {"validations": [{"type": "tester"}]}}}, limit: 20) {
            id
            name
            type
            attrs
            campus
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ПОИСК ОБЪЕКТОВ С ТЕСТЕРОМ")
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
            print(f"✅ Найдено {len(objects)} объектов с тестером")
            
            for i, obj in enumerate(objects[:10], 1):
                print(f"\n{i}. {obj.get('name', 'N/A')} ({obj.get('type', 'N/A')})")
                print(f"   Campus: {obj.get('campus', 'N/A')}")
                attrs = obj.get('attrs', {})
                if 'language' in attrs:
                    print(f"   Language: {attrs['language']}")
                if 'validations' in attrs:
                    validations = attrs['validations']
                    if validations and len(validations) > 0:
                        print(f"   Validation: {validations[0].get('type', 'N/A')}")
                        if 'testImage' in validations[0]:
                            print(f"   Test Image: {validations[0]['testImage']}")
            
            if len(objects) > 10:
                print(f"\n... и еще {len(objects) - 10} объектов")
            
            # Сохраняем результаты
            filename = f"object_tester_validation_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Результаты сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

def search_objects_by_campus():
    """Поиск объектов по кампусу"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Поиск объектов кампуса astanahub
    query = """
    query {
        object(where: {campus: {_eq: "astanahub"}}, limit: 50) {
            id
            name
            type
            attrs
            campus
            createdAt
        }
    }
    """
    
    print(f"\n{'='*60}")
    print(f"🔍 ПОИСК ОБЪЕКТОВ КАМПУСА ASTANAHUB")
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
            print(f"✅ Найдено {len(objects)} объектов кампуса astanahub")
            
            # Группируем по типам
            by_type = {}
            for obj in objects:
                obj_type = obj.get('type', 'unknown')
                if obj_type not in by_type:
                    by_type[obj_type] = []
                by_type[obj_type].append(obj)
            
            print(f"\n📊 Распределение по типам:")
            for obj_type, type_objects in sorted(by_type.items(), key=lambda x: len(x[1]), reverse=True):
                print(f"  {obj_type}: {len(type_objects)} объектов")
                
                # Показываем примеры
                for i, obj in enumerate(type_objects[:3], 1):
                    print(f"    {i}. {obj.get('name', 'N/A')} (ID: {obj.get('id', 'N/A')})")
                
                if len(type_objects) > 3:
                    print(f"    ... и еще {len(type_objects) - 3} объектов")
            
            # Сохраняем результаты
            filename = f"object_astanahub_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Результаты сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

def analyze_object_relationships():
    """Анализ связей между объектами"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Получаем объекты с их связями через progress
    query = """
    query {
        progress(limit: 100) {
            id
            userId
            objectId
            grade
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
    print(f"🔍 АНАЛИЗ СВЯЗЕЙ ОБЪЕКТОВ ЧЕРЕЗ PROGRESS")
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
            print(f"✅ Проанализировано {len(progress_records)} записей progress")
            
            # Анализируем объекты
            object_stats = {}
            user_stats = {}
            
            for record in progress_records:
                obj = record.get('object', {})
                user_id = record.get('userId')
                grade = record.get('grade')
                
                if obj:
                    obj_id = obj.get('id')
                    obj_name = obj.get('name', 'Unknown')
                    obj_type = obj.get('type', 'unknown')
                    
                    if obj_id not in object_stats:
                        object_stats[obj_id] = {
                            'name': obj_name,
                            'type': obj_type,
                            'attempts': 0,
                            'successful': 0,
                            'users': set()
                        }
                    
                    object_stats[obj_id]['attempts'] += 1
                    object_stats[obj_id]['users'].add(user_id)
                    
                    if grade is not None and grade >= 1:
                        object_stats[obj_id]['successful'] += 1
                
                if user_id:
                    if user_id not in user_stats:
                        user_stats[user_id] = {'attempts': 0, 'successful': 0}
                    
                    user_stats[user_id]['attempts'] += 1
                    if grade is not None and grade >= 1:
                        user_stats[user_id]['successful'] += 1
            
            # Выводим статистику по объектам
            print(f"\n📊 СТАТИСТИКА ПО ОБЪЕКТАМ:")
            print(f"{'Объект':<30} {'Тип':<15} {'Попытки':<10} {'Успешные':<12} {'Пользователи':<12}")
            print("-" * 85)
            
            for obj_id, stats in sorted(object_stats.items(), key=lambda x: x[1]['attempts'], reverse=True)[:15]:
                name = stats['name'][:27] + '...' if len(stats['name']) > 30 else stats['name']
                print(f"{name:<30} {stats['type']:<15} {stats['attempts']:<10} {stats['successful']:<12} {len(stats['users']):<12}")
            
            # Выводим статистику по пользователям
            print(f"\n👥 СТАТИСТИКА ПО ПОЛЬЗОВАТЕЛЯМ:")
            print(f"{'Пользователь':<15} {'Попытки':<10} {'Успешные':<12} {'Успешность':<12}")
            print("-" * 50)
            
            for user_id, stats in sorted(user_stats.items(), key=lambda x: x[1]['attempts'], reverse=True)[:10]:
                success_rate = (stats['successful'] / stats['attempts'] * 100) if stats['attempts'] > 0 else 0
                print(f"User {user_id:<10} {stats['attempts']:<10} {stats['successful']:<12} {success_rate:.1f}%")
            
            # Сохраняем результаты
            filename = f"object_relationships_analysis_{len(progress_records)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(progress_records, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Результаты сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    print("🚀 Запуск поиска и анализа объектов")
    
    # Запускаем все поисковые тесты
    search_objects_by_language()
    search_objects_by_type_and_attrs()
    search_objects_by_validation_type()
    search_objects_by_campus()
    analyze_object_relationships()
    
    print(f"\n{'='*60}")
    print("✅ Поиск и анализ завершены!")
    print(f"{'='*60}")