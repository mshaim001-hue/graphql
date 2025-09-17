#!/usr/bin/env python3
"""
Тест для фильтрации по attrs.validations.type: "user_audit"
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

def test_user_audit_filter():
    """Тест для фильтрации по user_audit"""
    token = load_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Запрос для получения всех объектов (фильтрация будет в Python)
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
    }
    """
    
    print("🔍 Тестируем фильтр по attrs.validations.type: 'user_audit'...")
    
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
            print(f"✅ Получено {len(all_objects)} объектов из API")
            
            # Фильтруем объекты с user_audit
            objects = []
            for obj in all_objects:
                validations = obj.get('attrs', {}).get('validations', [])
                for validation in validations:
                    if validation.get('type') == 'user_audit':
                        objects.append(obj)
                        break  # Добавляем объект только один раз
            
            print(f"✅ Найдено {len(objects)} объектов с user_audit")
            
            # Анализируем типы объектов
            types = {}
            languages = {}
            campuses = {}
            
            for obj in objects:
                # Типы объектов
                obj_type = obj.get('type', 'Unknown')
                types[obj_type] = types.get(obj_type, 0) + 1
                
                # Языки программирования
                language = obj.get('attrs', {}).get('language', 'Unknown')
                languages[language] = languages.get(language, 0) + 1
                
                # Кампусы
                campus = obj.get('campus', 'None')
                campuses[campus] = campuses.get(campus, 0) + 1
            
            print(f"\n📊 Анализ объектов с user_audit:")
            print("=" * 60)
            
            print(f"\n🏷️ По типам объектов:")
            for obj_type, count in sorted(types.items(), key=lambda x: x[1], reverse=True):
                print(f"   {obj_type}: {count}")
            
            print(f"\n💻 По языкам программирования:")
            for language, count in sorted(languages.items(), key=lambda x: x[1], reverse=True):
                print(f"   {language}: {count}")
            
            print(f"\n🏫 По кампусам:")
            for campus, count in sorted(campuses.items(), key=lambda x: x[1], reverse=True):
                print(f"   {campus}: {count}")
            
            # Показываем примеры объектов
            print(f"\n📋 Примеры объектов с user_audit (первые 10):")
            print("-" * 80)
            
            for i, obj in enumerate(objects[:10], 1):
                name = obj.get('name', 'N/A')
                obj_type = obj.get('type', 'N/A')
                language = obj.get('attrs', {}).get('language', 'N/A')
                campus = obj.get('campus', 'N/A')
                createdAt = obj.get('createdAt', 'N/A')
                if createdAt != 'N/A':
                    createdAt = createdAt.split('T')[0]  # Показываем только дату
                
                print(f"{i:2d}. {name}")
                print(f"     Type: {obj_type} | Language: {language} | Campus: {campus} | Created: {createdAt}")
                
                # Показываем информацию о валидации
                validations = obj.get('attrs', {}).get('validations', [])
                for validation in validations:
                    if validation.get('type') == 'user_audit':
                        form = validation.get('form', 'N/A')
                        print(f"     User Audit Form: {form}")
                print("-" * 40)
            
            if len(objects) > 10:
                print(f"\n... и еще {len(objects) - 10} объектов")
            
            # Анализируем только проекты с user_audit
            projects = [obj for obj in objects if obj.get('type') == 'project']
            print(f"\n🎯 Проекты с user_audit: {len(projects)}")
            
            if projects:
                print(f"\n📊 Проекты по языкам:")
                project_languages = {}
                for project in projects:
                    language = project.get('attrs', {}).get('language', 'Unknown')
                    project_languages[language] = project_languages.get(language, 0) + 1
                
                for language, count in sorted(project_languages.items(), key=lambda x: x[1], reverse=True):
                    print(f"   {language}: {count} проектов")
            
            # Сохраняем данные
            analysis_data = {
                'total_objects': len(objects),
                'types': types,
                'languages': languages,
                'campuses': campuses,
                'projects_count': len(projects),
                'sample_objects': objects[:10]
            }
            
            filename = "user_audit_analysis.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n📁 Анализ сохранен в файл: {filename}")
    else:
        print(f"❌ HTTP ошибка: {response.status_code}")

if __name__ == "__main__":
    test_user_audit_filter()