#!/usr/bin/env python3
"""
Тест для сравнения проектов с user_audit и без него
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

def test_comparison_audit():
    """Тест для сравнения проектов с user_audit и без него"""
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
    
    print("🔍 Сравниваем проекты с user_audit и без него...")
    
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
            
            # Разделяем объекты на проекты с user_audit и без него
            user_audit_projects = []
            non_user_audit_projects = []
            
            for obj in all_objects:
                if obj.get('type') == 'project':
                    validations = obj.get('attrs', {}).get('validations', [])
                    has_user_audit = False
                    for validation in validations:
                        if validation.get('type') == 'user_audit':
                            has_user_audit = True
                            break
                    
                    if has_user_audit:
                        user_audit_projects.append(obj)
                    else:
                        non_user_audit_projects.append(obj)
            
            print(f"✅ Найдено {len(user_audit_projects)} проектов с user_audit")
            print(f"✅ Найдено {len(non_user_audit_projects)} проектов без user_audit")
            
            # Анализируем успешность для проектов с user_audit
            user_audit_objects_dict = {obj['id']: obj for obj in user_audit_projects}
            user_audit_successful = 0
            user_audit_total = 0
            
            for progress in progress_data:
                project_id = progress['object']['id']
                if project_id in user_audit_objects_dict:
                    user_audit_total += 1
                    if progress.get('grade') is not None and progress.get('grade') >= 1:
                        user_audit_successful += 1
            
            # Анализируем успешность для проектов без user_audit
            non_user_audit_objects_dict = {obj['id']: obj for obj in non_user_audit_projects}
            non_user_audit_successful = 0
            non_user_audit_total = 0
            
            for progress in progress_data:
                project_id = progress['object']['id']
                if project_id in non_user_audit_objects_dict:
                    non_user_audit_total += 1
                    if progress.get('grade') is not None and progress.get('grade') >= 1:
                        non_user_audit_successful += 1
            
            print(f"\n📊 Сравнение успешности проектов:")
            print("=" * 70)
            print(f"{'Тип проекта':<20} {'Всего':<8} {'Успешных':<10} {'Процент':<10}")
            print("-" * 70)
            
            user_audit_percentage = (user_audit_successful / user_audit_total * 100) if user_audit_total > 0 else 0
            non_user_audit_percentage = (non_user_audit_successful / non_user_audit_total * 100) if non_user_audit_total > 0 else 0
            
            print(f"{'С user_audit':<20} {user_audit_total:<8} {user_audit_successful:<10} {user_audit_percentage:>6.1f}%")
            print(f"{'Без user_audit':<20} {non_user_audit_total:<8} {non_user_audit_successful:<10} {non_user_audit_percentage:>6.1f}%")
            
            # Анализируем по языкам для проектов с user_audit
            print(f"\n📊 Проекты с user_audit по языкам:")
            print("-" * 50)
            
            user_audit_languages = {}
            for project in user_audit_projects:
                language = project.get('attrs', {}).get('language', 'Unknown')
                user_audit_languages[language] = user_audit_languages.get(language, 0) + 1
            
            for language, count in sorted(user_audit_languages.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"   {language}: {count} проектов")
            
            # Анализируем по языкам для проектов без user_audit
            print(f"\n📊 Проекты без user_audit по языкам:")
            print("-" * 50)
            
            non_user_audit_languages = {}
            for project in non_user_audit_projects:
                language = project.get('attrs', {}).get('language', 'Unknown')
                non_user_audit_languages[language] = non_user_audit_languages.get(language, 0) + 1
            
            for language, count in sorted(non_user_audit_languages.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"   {language}: {count} проектов")
            
            # Сравниваем кампусы
            print(f"\n📊 Распределение по кампусам:")
            print("-" * 50)
            
            user_audit_campuses = {}
            for project in user_audit_projects:
                campus = project.get('campus', 'None')
                user_audit_campuses[campus] = user_audit_campuses.get(campus, 0) + 1
            
            non_user_audit_campuses = {}
            for project in non_user_audit_projects:
                campus = project.get('campus', 'None')
                non_user_audit_campuses[campus] = non_user_audit_campuses.get(campus, 0) + 1
            
            print(f"С user_audit:")
            for campus, count in sorted(user_audit_campuses.items(), key=lambda x: x[1], reverse=True):
                print(f"   {campus}: {count} проектов")
            
            print(f"\nБез user_audit:")
            for campus, count in sorted(non_user_audit_campuses.items(), key=lambda x: x[1], reverse=True):
                print(f"   {campus}: {count} проектов")
            
            # Сохраняем данные
            comparison_data = {
                'user_audit_projects': {
                    'total': len(user_audit_projects),
                    'with_progress': user_audit_total,
                    'successful': user_audit_successful,
                    'success_rate': user_audit_percentage,
                    'languages': user_audit_languages,
                    'campuses': user_audit_campuses
                },
                'non_user_audit_projects': {
                    'total': len(non_user_audit_projects),
                    'with_progress': non_user_audit_total,
                    'successful': non_user_audit_successful,
                    'success_rate': non_user_audit_percentage,
                    'languages': non_user_audit_languages,
                    'campuses': non_user_audit_campuses
                }
            }
            
            filename = "audit_comparison_analysis.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(comparison_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Анализ сохранен в файл: {filename}")
            
            # Выводы
            print(f"\n💡 Выводы:")
            print("-" * 30)
            if user_audit_percentage > non_user_audit_percentage:
                print(f"✅ Проекты с user_audit имеют более высокую успешность")
                print(f"   ({user_audit_percentage:.1f}% vs {non_user_audit_percentage:.1f}%)")
            elif user_audit_percentage < non_user_audit_percentage:
                print(f"❌ Проекты без user_audit имеют более высокую успешность")
                print(f"   ({non_user_audit_percentage:.1f}% vs {user_audit_percentage:.1f}%)")
            else:
                print(f"⚖️ Проекты с user_audit и без него имеют одинаковую успешность")
                print(f"   ({user_audit_percentage:.1f}%)")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_comparison_audit()