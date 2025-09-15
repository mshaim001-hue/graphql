#!/usr/bin/env python3
"""
Скрипт для получения JWT токена для VS Code GraphQL расширения
"""

import requests
import json
import base64
import os

def get_jwt_token(username, password):
    """Получить JWT токен"""
    auth_url = 'https://01.tomorrow-school.ai/api/auth/signin'
    
    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
    
    headers = {
        'Authorization': f'Basic {credentials}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(auth_url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        if isinstance(data, str):
            return data
        else:
            return data.get('token') or data.get('access_token') or data.get('jwt')
            
    except Exception as e:
        print(f"Ошибка получения токена: {e}")
        return None

def create_env_file(token):
    """Создать .env файл с токеном"""
    env_content = f"GRAPHQL_TOKEN={token}\n"
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("✅ Создан файл .env с токеном")
    print("🔧 Теперь VS Code GraphQL расширение сможет использовать этот токен")

def main():
    print("🔑 Получение JWT токена для VS Code GraphQL")
    print("=" * 50)
    
    username = input("Введите username/email: ")
    password = input("Введите password: ")
    
    token = get_jwt_token(username, password)
    
    if token:
        print("✅ Токен получен успешно!")
        print(f"Токен: {token[:50]}...")
        
        create_env_file(token)
        
        print("\n📋 Следующие шаги:")
        print("1. Откройте проект в VS Code")
        print("2. Установите расширение 'GraphQL' от Prisma")
        print("3. Откройте файл queries.graphql")
        print("4. Попробуйте выполнить запрос 'GetUserInfo'")
        
    else:
        print("❌ Не удалось получить токен")

if __name__ == "__main__":
    main()
