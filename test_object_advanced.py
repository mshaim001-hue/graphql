#!/usr/bin/env python3
"""
Продвинутый скрипт для исследования таблицы public.object
Анализ типов объектов, атрибутов и связей
"""

import requests
import json
import os
from collections import defaultdict, Counter

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

def analyze_object_types():
    """Анализ всех типов объектов в системе"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения всех типов объектов
    query = """
    query {
        object(limit: 1000) {
            id
            name
            type
            attrs
            createdAt
            campus
            authorId
        }
    }
    """
    
    print(f"\n{'='*80}")
    print(f"🔍 АНАЛИЗ ТИПОВ ОБЪЕКТОВ")
    print(f"{'='*80}")
    
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
            print(f"✅ Проанализировано {len(objects)} объектов")
            
            # Анализ по типам
            type_stats = defaultdict(list)
            campus_stats = defaultdict(int)
            author_stats = defaultdict(int)
            attrs_stats = defaultdict(int)
            
            for obj in objects:
                obj_type = obj.get('type', 'unknown')
                campus = obj.get('campus', 'None')
                author_id = obj.get('authorId', 'None')
                attrs = obj.get('attrs', {})
                
                type_stats[obj_type].append(obj)
                campus_stats[campus] += 1
                author_stats[author_id] += 1
                
                # Анализ атрибутов
                if attrs:
                    for key in attrs.keys():
                        attrs_stats[key] += 1
            
            # Выводим статистику по типам
            print(f"\n📊 СТАТИСТИКА ПО ТИПАМ ОБЪЕКТОВ:")
            print(f"{'Тип':<25} {'Количество':<12} {'Процент':<10}")
            print("-" * 50)
            
            total_objects = len(objects)
            for obj_type, type_objects in sorted(type_stats.items(), key=lambda x: len(x[1]), reverse=True):
                count = len(type_objects)
                percentage = (count / total_objects) * 100
                print(f"{obj_type:<25} {count:<12} {percentage:.1f}%")
            
            # Выводим статистику по кампусам
            print(f"\n🏫 СТАТИСТИКА ПО КАМПУСАМ:")
            for campus, count in sorted(campus_stats.items(), key=lambda x: x[1], reverse=True):
                percentage = (count / total_objects) * 100
                print(f"  {campus}: {count} объектов ({percentage:.1f}%)")
            
            # Выводим статистику по авторам
            print(f"\n👥 ТОП-10 АВТОРОВ:")
            for author_id, count in sorted(author_stats.items(), key=lambda x: x[1], reverse=True)[:10]:
                percentage = (count / total_objects) * 100
                print(f"  Author {author_id}: {count} объектов ({percentage:.1f}%)")
            
            # Выводим статистику по атрибутам
            print(f"\n🏷️ ТОП-15 АТРИБУТОВ:")
            for attr, count in sorted(attrs_stats.items(), key=lambda x: x[1], reverse=True)[:15]:
                percentage = (count / total_objects) * 100
                print(f"  {attr}: {count} объектов ({percentage:.1f}%)")
            
            # Сохраняем полные данные
            filename = f"object_analysis_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Полные данные сохранены в файл: {filename}")
            
            return type_stats, campus_stats, author_stats, attrs_stats
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")
        return None, None, None, None

def analyze_specific_type(object_type, type_stats):
    """Детальный анализ конкретного типа объектов"""
    if not type_stats or object_type not in type_stats:
        print(f"❌ Тип '{object_type}' не найден в данных")
        return
    
    objects = type_stats[object_type]
    print(f"\n{'='*80}")
    print(f"🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ТИПА: {object_type.upper()}")
    print(f"{'='*80}")
    print(f"📊 Найдено {len(objects)} объектов типа '{object_type}'")
    
    # Анализ атрибутов для этого типа
    attrs_analysis = defaultdict(list)
    campus_analysis = defaultdict(int)
    
    for obj in objects:
        attrs = obj.get('attrs', {})
        campus = obj.get('campus', 'None')
        
        campus_analysis[campus] += 1
        
        for key, value in attrs.items():
            attrs_analysis[key].append(value)
    
    # Показываем распределение по кампусам
    print(f"\n🏫 Распределение по кампусам:")
    for campus, count in sorted(campus_analysis.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / len(objects)) * 100
        print(f"  {campus}: {count} объектов ({percentage:.1f}%)")
    
    # Показываем атрибуты
    print(f"\n🏷️ Атрибуты для типа '{object_type}':")
    for attr, values in sorted(attrs_analysis.items()):
        unique_values = len(set(str(v) for v in values))
        print(f"  {attr}: {len(values)} использований, {unique_values} уникальных значений")
        
        # Показываем примеры значений
        if unique_values <= 5:
            print(f"    Примеры: {list(set(str(v) for v in values))}")
        else:
            sample_values = list(set(str(v) for v in values))[:3]
            print(f"    Примеры: {sample_values}...")
    
    # Показываем примеры объектов
    print(f"\n📋 Примеры объектов типа '{object_type}':")
    for i, obj in enumerate(objects[:5], 1):
        print(f"\n  {i}. {obj.get('name', 'N/A')} (ID: {obj.get('id', 'N/A')})")
        print(f"     Campus: {obj.get('campus', 'N/A')}")
        print(f"     Author: {obj.get('authorId', 'N/A')}")
        print(f"     Created: {obj.get('createdAt', 'N/A')}")
        
        attrs = obj.get('attrs', {})
        if attrs:
            print(f"     Attrs: {list(attrs.keys())}")

def analyze_attrs_structure():
    """Анализ структуры атрибутов"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения объектов с атрибутами
    query = """
    query {
        object(where: {attrs: {_is_null: false}}, limit: 200) {
            id
            name
            type
            attrs
            campus
        }
    }
    """
    
    print(f"\n{'='*80}")
    print(f"🔍 АНАЛИЗ СТРУКТУРЫ АТРИБУТОВ")
    print(f"{'='*80}")
    
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
            print(f"✅ Проанализировано {len(objects)} объектов с атрибутами")
            
            # Анализ структуры атрибутов
            attr_types = defaultdict(list)
            attr_combinations = defaultdict(int)
            
            for obj in objects:
                attrs = obj.get('attrs', {})
                obj_type = obj.get('type', 'unknown')
                
                # Анализируем типы значений атрибутов
                for key, value in attrs.items():
                    value_type = type(value).__name__
                    attr_types[key].append(value_type)
                
                # Анализируем комбинации атрибутов
                attr_keys = tuple(sorted(attrs.keys()))
                attr_combinations[attr_keys] += 1
            
            # Выводим типы значений для каждого атрибута
            print(f"\n🏷️ ТИПЫ ЗНАЧЕНИЙ АТРИБУТОВ:")
            for attr, types in sorted(attr_types.items()):
                type_counts = Counter(types)
                total = len(types)
                print(f"\n  {attr}:")
                for value_type, count in type_counts.most_common():
                    percentage = (count / total) * 100
                    print(f"    {value_type}: {count} ({percentage:.1f}%)")
            
            # Выводим популярные комбинации атрибутов
            print(f"\n🔗 ПОПУЛЯРНЫЕ КОМБИНАЦИИ АТРИБУТОВ:")
            for combo, count in sorted(attr_combinations.items(), key=lambda x: x[1], reverse=True)[:10]:
                if len(combo) > 1:  # Показываем только комбинации из 2+ атрибутов
                    print(f"  {combo}: {count} объектов")
            
            # Сохраняем данные
            filename = f"object_attrs_analysis_{len(objects)}_items.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(objects, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Данные сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

def search_objects_by_criteria():
    """Поиск объектов по различным критериям"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Различные поисковые запросы
    search_queries = [
        {
            'name': 'Объекты с языками программирования',
            'query': """
            query {
                object(where: {attrs: {language: {_is_null: false}}}, limit: 50) {
                    id
                    name
                    type
                    attrs
                    campus
                }
            }
            """
        },
        {
            'name': 'Проекты с групповой работой',
            'query': """
            query {
                object(where: {type: {_eq: "project"}, attrs: {groupMax: {_is_null: false}}}, limit: 30) {
                    id
                    name
                    type
                    attrs
                    campus
                }
            }
            """
        },
        {
            'name': 'Объекты с валидацией',
            'query': """
            query {
                object(where: {attrs: {validations: {_is_null: false}}}, limit: 30) {
                    id
                    name
                    type
                    attrs
                    campus
                }
            }
            """
        }
    ]
    
    print(f"\n{'='*80}")
    print(f"🔍 ПОИСК ОБЪЕКТОВ ПО КРИТЕРИЯМ")
    print(f"{'='*80}")
    
    for search in search_queries:
        print(f"\n🔍 {search['name']}:")
        
        response = requests.post(
            'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql',
            json={'query': search['query']},
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
                
                # Показываем примеры
                for i, obj in enumerate(objects[:3], 1):
                    print(f"  {i}. {obj.get('name', 'N/A')} ({obj.get('type', 'N/A')})")
                    attrs = obj.get('attrs', {})
                    if 'language' in attrs:
                        print(f"     Language: {attrs['language']}")
                    if 'groupMax' in attrs:
                        print(f"     Group: {attrs.get('groupMin', '?')}-{attrs['groupMax']}")
                    if 'validations' in attrs:
                        print(f"     Validations: {len(attrs['validations'])}")
                
                if len(objects) > 3:
                    print(f"  ... и еще {len(objects) - 3} объектов")
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    print("🚀 Запуск продвинутого анализа public.object")
    
    # Основной анализ
    type_stats, campus_stats, author_stats, attrs_stats = analyze_object_types()
    
    if type_stats:
        # Детальный анализ популярных типов
        popular_types = sorted(type_stats.keys(), key=lambda x: len(type_stats[x]), reverse=True)[:5]
        
        for obj_type in popular_types:
            analyze_specific_type(obj_type, type_stats)
    
    # Анализ структуры атрибутов
    analyze_attrs_structure()
    
    # Поиск по критериям
    search_objects_by_criteria()
    
    print(f"\n{'='*80}")
    print("✅ Продвинутый анализ завершен!")
    print(f"{'='*80}")