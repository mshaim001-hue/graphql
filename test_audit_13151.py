#!/usr/bin/env python3
"""
Тестирование конкретного аудита 13151 для отладки проблемы
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

def test_audit_13151():
    """Тестировать аудит 13151"""
    print("🔍 Тестирование аудита 13151")
    print("=" * 50)
    
    # 1. Получить аудит 13151
    query = """
    query GetAuditById($auditId: Int!) {
        audit(where: {id: {_eq: $auditId}}) {
            id
            grade
            createdAt
            resultId
            attrs
            result {
                id
                userId
                objectId
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
    }
    """
    
    variables = {"auditId": 13151}
    
    print("1. Получение аудита 13151:")
    data = make_graphql_request(query, variables)
    
    if data and 'audit' in data:
        audits = data['audit']
        if audits:
            audit = audits[0]
            print(f"✅ Аудит найден: ID {audit['id']}")
            print(f"   Grade: {audit['grade']}")
            print(f"   ResultId: {audit['resultId']}")
            print(f"   Has Result: {bool(audit.get('result'))}")
            
            if audit.get('result'):
                result = audit['result']
                print(f"   Result ID: {result['id']}")
                print(f"   Result UserId: {result['userId']}")
                print(f"   Result ObjectId: {result['objectId']}")
                
                if result.get('object'):
                    obj = result['object']
                    print(f"   Object Name: {obj['name']}")
                    print(f"   Object Type: {obj['type']}")
                    print(f"   Object AuthorId: {obj['authorId']}")
                else:
                    print("   ❌ No object data")
                
                if result.get('user'):
                    user = result['user']
                    print(f"   User Login: {user['login']}")
                    print(f"   User Profile: {user['profile']}")
                else:
                    print("   ❌ No user data")
            else:
                print("   ❌ No result data")
                
            print(f"   Attrs: {audit.get('attrs')}")
        else:
            print("❌ Аудит не найден")
    else:
        print("❌ Ошибка получения аудита")
    
    # 2. Попробовать получить результат напрямую
    print("\n2. Получение результата 53666 напрямую:")
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
    
    variables = {"resultId": 53666}
    
    data = make_graphql_request(query, variables)
    
    if data and 'result' in data:
        results = data['result']
        if results:
            result = results[0]
            print(f"✅ Результат найден: ID {result['id']}")
            print(f"   UserId: {result['userId']}")
            print(f"   ObjectId: {result['objectId']}")
            print(f"   Grade: {result['grade']}")
            
            if result.get('object'):
                obj = result['object']
                print(f"   Object Name: {obj['name']}")
                print(f"   Object Type: {obj['type']}")
                print(f"   Object AuthorId: {obj['authorId']}")
            else:
                print("   ❌ No object data")
            
            if result.get('user'):
                user = result['user']
                print(f"   User Login: {user['login']}")
                print(f"   User Profile: {user['profile']}")
            else:
                print("   ❌ No user data")
        else:
            print("❌ Результат не найден")
    else:
        print("❌ Ошибка получения результата")

def test_user_audits():
    """Тестировать аудиты пользователя"""
    print("\n3. Получение аудитов пользователя:")
    
    # Сначала получим ID пользователя
    query = """
    query {
        user {
            id
            login
        }
    }
    """
    
    data = make_graphql_request(query)
    
    if data and 'user' in data:
        users = data['user']
        if users:
            user = users[0]
            user_id = user['id']
            print(f"✅ Пользователь: {user['login']} (ID: {user_id})")
            
            # Теперь получим аудиты этого пользователя
            query = """
            query GetUserAudits($auditorId: Int!) {
                audit(where: {auditorId: {_eq: $auditorId}}, limit: 5) {
                    id
                    grade
                    resultId
                    result {
                        id
                        object {
                            name
                        }
                        user {
                            login
                        }
                    }
                }
            }
            """
            
            variables = {"auditorId": user_id}
            data = make_graphql_request(query, variables)
            
            if data and 'audit' in data:
                audits = data['audit']
                print(f"✅ Найдено аудитов: {len(audits)}")
                
                for audit in audits:
                    print(f"   Аудит {audit['id']}:")
                    print(f"     Grade: {audit['grade']}")
                    print(f"     ResultId: {audit['resultId']}")
                    
                    if audit.get('result'):
                        result = audit['result']
                        if result.get('object'):
                            print(f"     Project: {result['object']['name']}")
                        else:
                            print(f"     Project: No object data")
                        
                        if result.get('user'):
                            print(f"     Author: {result['user']['login']}")
                        else:
                            print(f"     Author: No user data")
                    else:
                        print(f"     No result data")
            else:
                print("❌ Ошибка получения аудитов пользователя")
        else:
            print("❌ Пользователь не найден")
    else:
        print("❌ Ошибка получения пользователя")

if __name__ == "__main__":
    test_audit_13151()
    test_user_audits()
