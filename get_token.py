#!/usr/bin/env python3
"""
Скрипт для получения JWT токена от Tomorrow School API
"""

import requests
import json
import os
import base64

def get_jwt_token():
    """Получает JWT токен от API"""
    
    # URL для получения токена
    auth_url = "https://01.tomorrow-school.ai/api/auth/signin"
    
    # Создаем Basic Auth header
    username = "mshaimard"
    password = "mshaimard"
    credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
    
    try:
        print("🔐 Получение JWT токена...")
        
        # Отправляем POST запрос с Basic Auth
        response = requests.post(auth_url, headers={
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json'
        })
        
        if response.status_code == 200:
            data = response.json()
            jwt_token = data.get('jwt')
            
            if jwt_token:
                # Сохраняем токен в .env файл
                with open('.env', 'w') as f:
                    f.write(f"GRAPHQL_TOKEN={jwt_token}\n")
                
                print("✅ JWT токен успешно получен и сохранен в .env")
                print(f"🔑 Токен: {jwt_token[:50]}...")
                return jwt_token
            else:
                print("❌ JWT токен не найден в ответе")
                return None
        else:
            print(f"❌ Ошибка аутентификации: {response.status_code}")
            print(f"Ответ: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Ошибка при получении токена: {e}")
        return None

if __name__ == "__main__":
    get_jwt_token()
