#!/usr/bin/env python3
"""
Финальный тест для проверки графика языков программирования
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

def test_final_graph():
    """Финальный тест графика языков программирования"""
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
    
    print("🎯 Финальный тест графика языков программирования...")
    
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
            
            print(f"\n📊 Финальные данные для графика:")
            print("=" * 60)
            
            for i, (language, count) in enumerate(sorted_languages, 1):
                percentage = (count / len(objects)) * 100
                print(f"{i:2d}. {language:<25}: {count:>3} проектов ({percentage:5.1f}%)")
            
            # Проверяем топ-5 языков
            print(f"\n🏆 Топ-5 языков программирования:")
            for i, (language, count) in enumerate(sorted_languages[:5], 1):
                print(f"   {i}. {language}: {count} проектов")
            
            # Создаем SVG данные для проверки
            svg_data = {
                'total_projects': len(objects),
                'languages': sorted_languages,
                'top_5': sorted_languages[:5],
                'graph_title': 'Programming Languages in AstanaHub Projects'
            }
            
            # Сохраняем финальные данные
            filename = "final_languages_graph.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(svg_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Финальные данные сохранены в файл: {filename}")
            
            # Проверяем, что данные соответствуют JavaScript коду
            print(f"\n🔍 Проверка соответствия JavaScript коду:")
            js_data = [
                ('Go', 27), ('python', 21), ('Open', 14), ('dart', 14),
                ('cybersecurity', 11), ('unreal engine', 10), ('JavaScript', 10),
                ('blockchain', 7), ('DevOps', 7), ('sys', 6), ('Java', 5), ('rust', 4)
            ]
            
            matches = 0
            for js_lang, js_count in js_data:
                actual_count = languages.get(js_lang, 0)
                if actual_count == js_count:
                    print(f"   ✅ {js_lang}: {actual_count} (совпадает)")
                    matches += 1
                else:
                    print(f"   ❌ {js_lang}: {actual_count} (ожидалось {js_count})")
            
            print(f"\n📈 Результат: {matches}/{len(js_data)} языков совпадают с JavaScript кодом")
            
            if matches >= len(js_data) * 0.8:  # 80% совпадений
                print("✅ График готов к использованию!")
            else:
                print("⚠️  Рекомендуется обновить данные в JavaScript коде")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_final_graph()