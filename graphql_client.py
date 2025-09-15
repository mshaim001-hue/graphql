#!/usr/bin/env python3
"""
GraphQL Client for Tomorrow School API
Прямое взаимодействие с GraphQL API без веб-интерфейса
"""

import requests
import json
import base64
from typing import Dict, Any, Optional

class TomorrowSchoolGraphQLClient:
    def __init__(self, username: str, password: str):
        self.api_url = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql'
        self.auth_url = 'https://01.tomorrow-school.ai/api/auth/signin'
        self.jwt_token = None
        self.username = username
        self.password = password
        
    def authenticate(self) -> bool:
        """Аутентификация и получение JWT токена"""
        try:
            credentials = base64.b64encode(f"{self.username}:{self.password}".encode()).decode()
            
            headers = {
                'Authorization': f'Basic {credentials}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(self.auth_url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            
            if isinstance(data, str):
                self.jwt_token = data
            else:
                self.jwt_token = data.get('token') or data.get('access_token') or data.get('jwt')
            
            if not self.jwt_token:
                print("❌ Не удалось получить JWT токен")
                return False
                
            print("✅ Успешная аутентификация")
            return True
            
        except Exception as e:
            print(f"❌ Ошибка аутентификации: {e}")
            return False
    
    def query(self, query: str, variables: Optional[Dict] = None) -> Dict[str, Any]:
        """Выполнение GraphQL запроса"""
        if not self.jwt_token:
            print("❌ Сначала выполните аутентификацию")
            return {}
        
        try:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.jwt_token}'
            }
            
            payload = {
                'query': query
            }
            
            if variables:
                payload['variables'] = variables
            
            response = requests.post(self.api_url, headers=headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            if 'errors' in data:
                print(f"❌ GraphQL ошибки: {data['errors']}")
                return {}
            
            return data.get('data', {})
            
        except Exception as e:
            print(f"❌ Ошибка запроса: {e}")
            return {}
    
    def get_user_info(self) -> Dict[str, Any]:
        """Получить информацию о пользователе"""
        query = """
        query {
            user {
                id
                login
                profile
                attrs
                createdAt
                campus
            }
        }
        """
        return self.query(query)
    
    def get_audits_with_results(self, limit: int = 10) -> Dict[str, Any]:
        """Получить аудиты с результатами"""
        query = f"""
        query {{
            audit(limit: {limit}) {{
                id
                grade
                createdAt
                resultId
                result {{
                    id
                    userId
                    objectId
                    object {{
                        id
                        name
                        type
                        authorId
                    }}
                    user {{
                        id
                        login
                        profile
                        attrs
                    }}
                }}
            }}
        }}
        """
        return self.query(query)
    
    def get_results_directly(self, limit: int = 10) -> Dict[str, Any]:
        """Получить результаты напрямую"""
        query = f"""
        query {{
            result(limit: {limit}) {{
                id
                userId
                objectId
                grade
                object {{
                    id
                    name
                    type
                    authorId
                }}
                user {{
                    id
                    login
                    profile
                    attrs
                }}
            }}
        }}
        """
        return self.query(query)
    
    def get_objects(self, limit: int = 20) -> Dict[str, Any]:
        """Получить объекты (проекты, упражнения)"""
        query = f"""
        query {{
            object(limit: {limit}) {{
                id
                name
                type
                authorId
                attrs
            }}
        }}
        """
        return self.query(query)
    
    def analyze_audit_data(self) -> None:
        """Анализ данных аудитов для отладки"""
        print("🔍 Анализ данных аудитов...")
        
        # Получаем аудиты
        audits_data = self.get_audits_with_results(5)
        audits = audits_data.get('audit', [])
        
        print(f"📊 Найдено аудитов: {len(audits)}")
        
        for i, audit in enumerate(audits, 1):
            print(f"\n--- Аудит {i} (ID: {audit.get('id')}) ---")
            print(f"Grade: {audit.get('grade')}")
            print(f"ResultId: {audit.get('resultId')}")
            print(f"Has Result: {bool(audit.get('result'))}")
            
            if audit.get('result'):
                result = audit['result']
                print(f"Result ID: {result.get('id')}")
                print(f"Result UserId: {result.get('userId')}")
                print(f"Result ObjectId: {result.get('objectId')}")
                
                if result.get('object'):
                    obj = result['object']
                    print(f"Object Name: {obj.get('name')}")
                    print(f"Object Type: {obj.get('type')}")
                    print(f"Object AuthorId: {obj.get('authorId')}")
                else:
                    print("❌ No object data")
                
                if result.get('user'):
                    user = result['user']
                    print(f"User Login: {user.get('login')}")
                    print(f"User Profile: {user.get('profile')}")
                else:
                    print("❌ No user data")
            else:
                print("❌ No result data")

def main():
    """Основная функция для тестирования"""
    print("🚀 GraphQL Client для Tomorrow School")
    print("=" * 50)
    
    # Замените на ваши учетные данные
    username = input("Введите username/email: ")
    password = input("Введите password: ")
    
    client = TomorrowSchoolGraphQLClient(username, password)
    
    if not client.authenticate():
        return
    
    print("\n" + "=" * 50)
    print("📋 Доступные команды:")
    print("1. Информация о пользователе")
    print("2. Аудиты с результатами")
    print("3. Результаты напрямую")
    print("4. Объекты (проекты)")
    print("5. Анализ данных аудитов")
    print("0. Выход")
    
    while True:
        choice = input("\nВыберите команду (0-5): ")
        
        if choice == "0":
            break
        elif choice == "1":
            data = client.get_user_info()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        elif choice == "2":
            data = client.get_audits_with_results()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        elif choice == "3":
            data = client.get_results_directly()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        elif choice == "4":
            data = client.get_objects()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        elif choice == "5":
            client.analyze_audit_data()
        else:
            print("❌ Неверный выбор")

if __name__ == "__main__":
    main()
