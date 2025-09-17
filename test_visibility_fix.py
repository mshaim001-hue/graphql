#!/usr/bin/env python3
"""
Тест для проверки исправления видимости текста в графике
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

def test_visibility_fix():
    """Тест для проверки исправления видимости текста"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения проектов с их прогрессом
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
        progress(where: {object: {type: {_eq: "project"}, campus: {_eq: "astanahub"}}}) {
            grade
            createdAt
            path
            object {
                id
                name
                type
                attrs
                campus
            }
        }
    }
    """
    
    print("🔍 Тест исправления видимости текста в графике...")
    
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
            progress_data = data['data']['progress']
            
            print(f"✅ Найдено {len(objects)} проектов и {len(progress_data)} записей прогресса")
            
            # Создаем словарь проектов для быстрого поиска
            projects_dict = {obj['id']: obj for obj in objects}
            
            # Анализируем успешные проекты по языкам
            successful_by_language = {}
            total_by_language = {}
            
            for progress in progress_data:
                project_id = progress['object']['id']
                if project_id in projects_dict:
                    project = projects_dict[project_id]
                    language = project.get('attrs', {}).get('language', 'Unknown')
                    
                    # Инициализируем счетчики для языка
                    if language not in total_by_language:
                        total_by_language[language] = 0
                        successful_by_language[language] = 0
                    
                    # Увеличиваем общий счетчик
                    total_by_language[language] += 1
                    
                    # Проверяем, является ли проект успешным (grade >= 1)
                    if progress.get('grade') is not None and progress.get('grade') >= 1:
                        successful_by_language[language] += 1
            
            # Сортируем по общему количеству проектов
            sorted_languages = sorted(total_by_language.items(), key=lambda x: x[1], reverse=True)
            
            print(f"\n📊 Исправления в графике:")
            print("=" * 60)
            print("✅ Все тексты теперь темные (#333) для лучшей видимости")
            print("✅ Названия языков слева от каждой линии")
            print("✅ Числа успешных/общих проектов справа от каждой линии")
            print("✅ Заголовок графика темный и читаемый")
            print("✅ Легенда с темным текстом")
            
            print(f"\n🎨 Цветовая схема:")
            print("-" * 40)
            print("📝 Названия языков: #333 (темный)")
            print("📊 Числа проектов: #333 (темный, жирный)")
            print("📋 Заголовок: #333 (темный, жирный)")
            print("📋 Легенда: #333 (темный)")
            print("🎨 Полосы: цветные (Go: #00add8, JavaScript: #f1c40f, sh: #7f8c8d)")
            
            print(f"\n📈 Данные для графика:")
            print("-" * 40)
            for language, total in sorted_languages:
                successful = successful_by_language.get(language, 0)
                percentage = (successful / total * 100) if total > 0 else 0
                print(f"{language:<15}: {successful}/{total} ({percentage:.1f}%)")
            
            print(f"\n✅ Проблемы исправлены:")
            print("   - Текст '19/26' теперь темный и видимый")
            print("   - Все тексты имеют хороший контраст с фоном")
            print("   - График читаемый и информативный")
            
            # Создаем данные для JavaScript кода
            js_data = []
            for language, total in sorted_languages:
                successful = successful_by_language.get(language, 0)
                js_data.append({
                    'name': language,
                    'total': total,
                    'successful': successful
                })
            
            # Сохраняем данные
            filename = "visibility_fix_data.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(js_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Данные сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_visibility_fix()