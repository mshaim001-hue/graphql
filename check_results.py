#!/usr/bin/env python3
"""
Проверка существования результатов по ID из аудитов
"""

import requests
import json
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def make_graphql_request(query, variables=None):
    """Выполнить GraphQL запрос"""
    api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
    token = os.getenv('GRAPHQL_TOKEN')
    
    if not token:
        print("❌ GRAPHQL_TOKEN не найден в .env файле")
        return None
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    payload = {
        'query': query
    }
    
    if variables:
        payload['variables'] = variables
    
    try:
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()
        
        if 'errors' in data:
            print(f"❌ GraphQL ошибки: {data['errors']}")
            return None
        
        return data.get('data', {})
        
    except Exception as e:
        print(f"❌ Ошибка запроса: {e}")
        return None

def check_results_exist():
    """Проверить существование результатов"""
    print("🔍 Проверка существования результатов")
    print("=" * 50)
    
    # ID результатов из аудитов
    result_ids = [53666, 46370, 95241, 54335, 53034, 240932]
    
    for result_id in result_ids:
        print(f"\nПроверка результата {result_id}:")
        
        query = """
        query GetResultById($resultId: Int!) {
            result(where: {id: {_eq: $resultId}}) {
                id
                userId
                objectId
                grade
                object {
                    id
                    name
                    type
                    authorId
                }
                user {
                    id
                    login
                    profile
                    attrs
                }
            }
        }
        """
        
        variables = {"resultId": result_id}
        data = make_graphql_request(query, variables)
        
        if data and 'result' in data:
            results = data['result']
            if results:
                result = results[0]
                print(f"  ✅ Результат найден")
                print(f"     UserId: {result['userId']}")
                print(f"     ObjectId: {result['objectId']}")
                print(f"     Grade: {result['grade']}")
                
                if result.get('object'):
                    obj = result['object']
                    print(f"     Project: {obj['name']} (Type: {obj['type']})")
                    print(f"     AuthorId: {obj['authorId']}")
                else:
                    print(f"     ❌ No object data")
                
                if result.get('user'):
                    user = result['user']
                    print(f"     Author: {user['login']}")
                else:
                    print(f"     ❌ No user data")
            else:
                print(f"  ❌ Результат не найден")
        else:
            print(f"  ❌ Ошибка запроса")

def check_all_results():
    """Проверить все доступные результаты"""
    print("\n🔍 Проверка всех доступных результатов")
    print("=" * 50)
    
    query = """
    query GetAllResults($limit: Int!) {
        result(limit: $limit, order_by: {id: desc}) {
            id
            userId
            objectId
            grade
            object {
                id
                name
                type
                authorId
            }
            user {
                id
                login
            }
        }
    }
    """
    
    variables = {"limit": 20}
    data = make_graphql_request(query, variables)
    
    if data and 'result' in data:
        results = data['result']
        print(f"✅ Найдено результатов: {len(results)}")
        
        for result in results[:10]:  # Показываем первые 10
            print(f"  Result {result['id']}:")
            print(f"    UserId: {result['userId']}")
            print(f"    ObjectId: {result['objectId']}")
            print(f"    Grade: {result['grade']}")
            
            if result.get('object'):
                obj = result['object']
                print(f"    Project: {obj['name']} (Type: {obj['type']})")
            else:
                print(f"    ❌ No object data")
            
            if result.get('user'):
                user = result['user']
                print(f"    Author: {user['login']}")
            else:
                print(f"    ❌ No user data")
            print()
    else:
        print("❌ Ошибка получения результатов")

def check_audit_result_connection():
    """Проверить связь между аудитами и результатами"""
    print("\n🔍 Проверка связи audit -> result")
    print("=" * 50)
    
    # Получим аудиты с resultId
    query = """
    query GetAuditsWithResultId {
        audit(limit: 10, order_by: {id: desc}) {
            id
            grade
            resultId
            result {
                id
                userId
                objectId
                object {
                    name
                    type
                }
                user {
                    login
                }
            }
        }
    }
    """
    
    data = make_graphql_request(query)
    
    if data and 'audit' in data:
        audits = data['audit']
        print(f"✅ Найдено аудитов: {len(audits)}")
        
        for audit in audits:
            print(f"  Аудит {audit['id']}:")
            print(f"    Grade: {audit['grade']}")
            print(f"    ResultId: {audit['resultId']}")
            print(f"    Has Result: {bool(audit.get('result'))}")
            
            if audit.get('result'):
                result = audit['result']
                print(f"    ✅ Result data available")
                if result.get('object'):
                    print(f"    Project: {result['object']['name']}")
                if result.get('user'):
                    print(f"    Author: {result['user']['login']}")
            else:
                print(f"    ❌ No result data")
            print()
    else:
        print("❌ Ошибка получения аудитов")

if __name__ == "__main__":
    check_results_exist()
    check_all_results()
    check_audit_result_connection()