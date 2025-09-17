#!/usr/bin/env python3
"""
Тест для проверки графика языков программирования
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

def test_languages_graph_data():
    """Тест данных для графика языков программирования"""
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
    
    print("🔍 Тестируем данные для графика языков программирования...")
    
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
            
            # Анализируем языки программирования
            languages = {}
            for obj in objects:
                language = obj.get('attrs', {}).get('language', 'Unknown')
                languages[language] = languages.get(language, 0) + 1
            
            # Сортируем по количеству проектов
            sorted_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)
            
            print(f"\n📊 Данные для графика (в порядке убывания):")
            print("=" * 50)
            
            for i, (language, count) in enumerate(sorted_languages, 1):
                print(f"{i:2d}. {language:<20}: {count:>3} проектов")
            
            print(f"\n🎨 Цвета для языков:")
            colors = {
                'Go': '#00add8',
                'Python': '#3776ab',
                'Open': '#e74c3c',
                'Dart': '#0175c2',
                'Cybersecurity': '#e74c3c',
                'Unreal Engine': '#f39c12',
                'JavaScript': '#f1c40f',
                'DevOps': '#8e44ad',
                'Blockchain': '#e74c3c',
                'Sys': '#7f8c8d',
                'Java': '#e74c3c',
                'Rust': '#e74c3c',
                'TypeScript': '#007acc',
                'C': '#7f8c8d',
                'Go,HTML,CSS,JS': '#00add8',
                'Shell': '#7f8c8d',
                'PHP': '#8e44ad',
                'Ruby': '#e74c3c',
                'C++': '#7f8c8d'
            }
            
            for language, count in sorted_languages:
                color = colors.get(language, '#7f8c8d')
                print(f"   {language:<20}: {color}")
            
            # Проверяем, что данные соответствуют ожидаемым
            expected_data = [
                ('Go', 27), ('Python', 21), ('Open', 14), ('Dart', 14),
                ('Cybersecurity', 11), ('Unreal Engine', 10), ('JavaScript', 10),
                ('DevOps', 7), ('Blockchain', 7), ('Sys', 6), ('Java', 5), ('Rust', 4)
            ]
            
            print(f"\n🔍 Проверка соответствия ожидаемым данным:")
            for expected_lang, expected_count in expected_data:
                actual_count = languages.get(expected_lang, 0)
                if actual_count == expected_count:
                    print(f"   ✅ {expected_lang}: {actual_count} (ожидалось {expected_count})")
                else:
                    print(f"   ❌ {expected_lang}: {actual_count} (ожидалось {expected_count})")
            
            # Сохраняем данные для графика
            graph_data = {
                'languages': sorted_languages,
                'total_projects': len(objects),
                'colors': colors
            }
            
            filename = f"languages_graph_data.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(graph_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Данные для графика сохранены в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_languages_graph_data()