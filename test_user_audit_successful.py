#!/usr/bin/env python3
"""
Тест для анализа успешных проектов с user_audit
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

def test_user_audit_successful():
    """Тест для анализа успешных проектов с user_audit"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения всех объектов и прогресса
    query = """
    query {
        object(order_by: {createdAt: desc}) {
            id
            name
            type
            attrs
            createdAt
            updatedAt
            campus
            authorId
        }
        progress(where: {object: {type: {_eq: "project"}}}) {
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
    
    print("🔍 Анализируем успешные проекты с user_audit...")
    
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
            all_objects = data['data']['object']
            progress_data = data['data']['progress']
            
            print(f"✅ Получено {len(all_objects)} объектов и {len(progress_data)} записей прогресса")
            
            # Фильтруем объекты с user_audit
            user_audit_objects = []
            for obj in all_objects:
                validations = obj.get('attrs', {}).get('validations', [])
                for validation in validations:
                    if validation.get('type') == 'user_audit':
                        user_audit_objects.append(obj)
                        break
            
            print(f"✅ Найдено {len(user_audit_objects)} объектов с user_audit")
            
            # Создаем словарь объектов для быстрого поиска
            objects_dict = {obj['id']: obj for obj in user_audit_objects}
            
            # Анализируем успешные проекты с user_audit по языкам
            successful_by_language = {}
            total_by_language = {}
            
            for progress in progress_data:
                project_id = progress['object']['id']
                if project_id in objects_dict:
                    project = objects_dict[project_id]
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
            
            print(f"\n📊 Успешные проекты с user_audit по языкам:")
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
            
            # Показываем топ-10 языков
            print(f"\n🏆 Топ-10 языков по успешности (user_audit):")
            for i, data in enumerate(graph_data[:10], 1):
                print(f"   {i:2d}. {data['language']:<20}: {data['successful']}/{data['total']} ({data['percentage']:.1f}%)")
            
            # Сравниваем с общими данными
            print(f"\n📈 Сравнение с общими данными:")
            print("-" * 50)
            print(f"Всего проектов с user_audit: {len(user_audit_objects)}")
            print(f"Проектов с данными о прогрессе: {sum(total_by_language.values())}")
            print(f"Успешных проектов: {sum(successful_by_language.values())}")
            
            if sum(total_by_language.values()) > 0:
                overall_success_rate = (sum(successful_by_language.values()) / sum(total_by_language.values())) * 100
                print(f"Общий процент успешности: {overall_success_rate:.1f}%")
            
            # Сохраняем данные
            analysis_data = {
                'total_user_audit_objects': len(user_audit_objects),
                'projects_with_progress': sum(total_by_language.values()),
                'successful_projects': sum(successful_by_language.values()),
                'overall_success_rate': overall_success_rate if sum(total_by_language.values()) > 0 else 0,
                'languages_data': graph_data,
                'top_10_languages': graph_data[:10]
            }
            
            filename = "user_audit_successful_analysis.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Анализ сохранен в файл: {filename}")
            
            # Показываем визуализацию
            print(f"\n🎨 Визуализация топ-5 языков:")
            print("=" * 50)
            
            for data in graph_data[:5]:
                language = data['language']
                total = data['total']
                successful = data['successful']
                percentage = data['percentage']
                
                # Создаем визуальную полосу
                bar_length = 30
                successful_bars = int((successful / total) * bar_length) if total > 0 else 0
                total_bars = bar_length
                
                bar = '█' * successful_bars + '░' * (total_bars - successful_bars)
                
                print(f"{language:<20}: {bar} {successful}/{total} ({percentage:.1f}%)")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_user_audit_successful()