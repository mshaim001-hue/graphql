#!/usr/bin/env python3
"""
Итоговая сводка по исследованию public.object
"""

import json
import os
from collections import Counter

def load_json_file(filename):
    """Загружает JSON файл"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Файл {filename} не найден")
        return None
    except json.JSONDecodeError:
        print(f"❌ Ошибка при чтении JSON файла {filename}")
        return None

def analyze_objects_summary():
    """Анализ сводки по объектам"""
    print("🚀 ИТОГОВАЯ СВОДКА ПО ИССЛЕДОВАНИЮ PUBLIC.OBJECT")
    print("=" * 80)
    
    # Загружаем основные данные
    objects_1000 = load_json_file("object_analysis_1000_items.json")
    objects_astanahub = load_json_file("object_astanahub_50_items.json")
    relationships = load_json_file("object_relationships_analysis_100_items.json")
    
    if not objects_1000:
        print("❌ Не удалось загрузить основные данные")
        return
    
    print(f"\n📊 ОСНОВНАЯ СТАТИСТИКА:")
    print(f"   Всего объектов проанализировано: {len(objects_1000)}")
    
    if objects_astanahub:
        print(f"   Объектов кампуса astanahub: {len(objects_astanahub)}")
    
    if relationships:
        print(f"   Записей progress для анализа связей: {len(relationships)}")
    
    # Анализ типов
    types = [obj.get('type', 'unknown') for obj in objects_1000]
    type_counts = Counter(types)
    
    print(f"\n🏷️ ТОП-10 ТИПОВ ОБЪЕКТОВ:")
    for obj_type, count in type_counts.most_common(10):
        percentage = (count / len(objects_1000)) * 100
        print(f"   {obj_type:<20}: {count:>4} ({percentage:>5.1f}%)")
    
    # Анализ кампусов
    campuses = [obj.get('campus', 'None') for obj in objects_1000]
    campus_counts = Counter(campuses)
    
    print(f"\n🏫 РАСПРЕДЕЛЕНИЕ ПО КАМПУСАМ:")
    for campus, count in campus_counts.most_common():
        percentage = (count / len(objects_1000)) * 100
        campus_str = str(campus) if campus is not None else "None"
        print(f"   {campus_str:<15}: {count:>4} ({percentage:>5.1f}%)")
    
    # Анализ языков программирования
    languages = []
    for obj in objects_1000:
        attrs = obj.get('attrs', {})
        if 'language' in attrs:
            languages.append(attrs['language'])
    
    if languages:
        lang_counts = Counter(languages)
        print(f"\n💻 ЯЗЫКИ ПРОГРАММИРОВАНИЯ:")
        for lang, count in lang_counts.most_common():
            percentage = (count / len(languages)) * 100
            print(f"   {lang:<15}: {count:>4} ({percentage:>5.1f}%)")
    
    # Анализ атрибутов
    all_attrs = []
    for obj in objects_1000:
        attrs = obj.get('attrs', {})
        all_attrs.extend(attrs.keys())
    
    if all_attrs:
        attr_counts = Counter(all_attrs)
        print(f"\n🏷️ ТОП-10 АТРИБУТОВ:")
        for attr, count in attr_counts.most_common(10):
            percentage = (count / len(objects_1000)) * 100
            print(f"   {attr:<20}: {count:>4} ({percentage:>5.1f}%)")
    
    # Анализ связей
    if relationships:
        print(f"\n🔗 АНАЛИЗ СВЯЗЕЙ:")
        
        # Статистика по объектам
        object_attempts = {}
        for record in relationships:
            obj = record.get('object', {})
            if obj:
                obj_id = obj.get('id')
                obj_name = obj.get('name', 'Unknown')
                if obj_id not in object_attempts:
                    object_attempts[obj_id] = {'name': obj_name, 'attempts': 0, 'successful': 0}
                
                object_attempts[obj_id]['attempts'] += 1
                grade = record.get('grade')
                if grade is not None and grade >= 1:
                    object_attempts[obj_id]['successful'] += 1
        
        print(f"   Топ-5 объектов по активности:")
        sorted_objects = sorted(object_attempts.items(), key=lambda x: x[1]['attempts'], reverse=True)
        for i, (obj_id, stats) in enumerate(sorted_objects[:5], 1):
            success_rate = (stats['successful'] / stats['attempts'] * 100) if stats['attempts'] > 0 else 0
            print(f"   {i}. {stats['name']:<25}: {stats['attempts']} попыток, {stats['successful']} успешных ({success_rate:.1f}%)")
        
        # Статистика по пользователям
        user_stats = {}
        for record in relationships:
            user_id = record.get('userId')
            if user_id:
                if user_id not in user_stats:
                    user_stats[user_id] = {'attempts': 0, 'successful': 0}
                
                user_stats[user_id]['attempts'] += 1
                grade = record.get('grade')
                if grade is not None and grade >= 1:
                    user_stats[user_id]['successful'] += 1
        
        print(f"\n   Статистика пользователей:")
        for user_id, stats in user_stats.items():
            success_rate = (stats['successful'] / stats['attempts'] * 100) if stats['attempts'] > 0 else 0
            print(f"   User {user_id}: {stats['attempts']} попыток, {stats['successful']} успешных ({success_rate:.1f}%)")

def show_created_files():
    """Показывает созданные файлы"""
    print(f"\n📁 СОЗДАННЫЕ ФАЙЛЫ:")
    
    object_files = [
        "object_analysis_1000_items.json",
        "object_astanahub_50_items.json", 
        "object_relationships_analysis_100_items.json",
        "object_attrs_analysis_200_items.json",
        "object_by_type_data_50_items.json",
        "object_with_attrs_data_30_items.json",
        "object_data_20_items.json",
        "object_search_checkpoint_data_20_items.json"
    ]
    
    test_files = [
        "test_object.py",
        "test_object_advanced.py", 
        "test_object_search.py"
    ]
    
    report_files = [
        "object_analysis_report.md"
    ]
    
    print(f"\n   📊 Данные об объектах:")
    for filename in object_files:
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            size_kb = size / 1024
            print(f"   ✅ {filename:<40} ({size_kb:.1f} KB)")
        else:
            print(f"   ❌ {filename:<40} (не найден)")
    
    print(f"\n   🧪 Тестовые скрипты:")
    for filename in test_files:
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            size_kb = size / 1024
            print(f"   ✅ {filename:<40} ({size_kb:.1f} KB)")
        else:
            print(f"   ❌ {filename:<40} (не найден)")
    
    print(f"\n   📋 Отчеты:")
    for filename in report_files:
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            size_kb = size / 1024
            print(f"   ✅ {filename:<40} ({size_kb:.1f} KB)")
        else:
            print(f"   ❌ {filename:<40} (не найден)")

def show_recommendations():
    """Показывает рекомендации для дальнейшего исследования"""
    print(f"\n💡 РЕКОМЕНДАЦИИ ДЛЯ ДАЛЬНЕЙШЕГО ИССЛЕДОВАНИЯ:")
    print(f"   1. Изучить связи между объектами через таблицы progress, result, event")
    print(f"   2. Проанализировать валидационные правила для каждого типа объектов")
    print(f"   3. Исследовать временные паттерны создания объектов")
    print(f"   4. Изучить влияние атрибутов на успешность выполнения заданий")
    print(f"   5. Создать визуализацию связей между объектами")
    print(f"   6. Исследовать паттерны использования языков программирования")
    print(f"   7. Анализировать эффективность различных типов валидации")

if __name__ == "__main__":
    analyze_objects_summary()
    show_created_files()
    show_recommendations()
    
    print(f"\n{'='*80}")
    print("✅ Исследование public.object завершено!")
    print("📋 Подробный отчет доступен в файле: object_analysis_report.md")
    print(f"{'='*80}")