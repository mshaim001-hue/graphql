#!/usr/bin/env python3
"""
Тест для получения данных об успешных проектах по языкам программирования
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

def test_successful_projects():
    """Тест для получения успешных проектов по языкам"""
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
    
    print("🔍 Тестируем успешные проекты по языкам программирования...")
    
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
            
            print(f"\n📊 Успешные проекты по языкам программирования:")
            print("=" * 80)
            print(f"{'Язык':<25} {'Всего':<8} {'Успешных':<10} {'Процент':<10}")
            print("-" * 80)
            
            for language, total in sorted_languages:
                successful = successful_by_language.get(language, 0)
                percentage = (successful / total * 100) if total > 0 else 0
                print(f"{language:<25} {total:<8} {successful:<10} {percentage:>6.1f}%")
            
            # Создаем данные для графика
            graph_data = []
            for language, total in sorted_languages:
                successful = successful_by_language.get(language, 0)
                percentage = (successful / total * 100) if total > 0 else 0
                graph_data.append({
                    'language': language,
                    'total': total,
                    'successful': successful,
                    'percentage': percentage
                })
            
            # Сохраняем данные
            filename = "successful_projects_data.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(graph_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Данные сохранены в файл: {filename}")
            
            # Показываем топ-5 языков
            print(f"\n🏆 Топ-5 языков по успешности:")
            for i, data in enumerate(graph_data[:5], 1):
                print(f"   {i}. {data['language']}: {data['successful']}/{data['total']} ({data['percentage']:.1f}%)")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_successful_projects()