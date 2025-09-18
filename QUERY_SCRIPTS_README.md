# GraphQL Query Scripts

Этот набор скриптов позволяет выполнять GraphQL запросы к Tomorrow School API и сохранять результаты в JSON файлы.

## Настройка

### 1. Установка зависимостей
```bash
pip3 install requests
```

### 2. Настройка переменных окружения

Скопируйте файл `env_example.txt` в `.env` и заполните ваши данные:

```bash
cp env_example.txt .env
```

Или установите переменные окружения напрямую:

```bash
# Вариант 1: Использовать JWT токен (рекомендуется)
export TOMORROW_SCHOOL_JWT="your_jwt_token_here"

# Вариант 2: Использовать логин и пароль
export TOMORROW_SCHOOL_USERNAME="your_username"
export TOMORROW_SCHOOL_PASSWORD="your_password"
```

## Доступные скрипты

### 1. audit_query.py
Выполняет запрос к таблице `audit` и сохраняет результаты.

**Запрос:**
```graphql
query {
    audit(order_by: {createdAt: desc}) {
        id
        grade
        createdAt
        group {
            id
            status
            path
        }
    }
}
```

**Запуск:**
```bash
python3 audit_query.py
```

**Результат:** `audit_results_YYYYMMDD_HHMMSS.json`

### 2. group_user_query.py
Выполняет запрос к таблице `group_user` и сохраняет результаты.

**Запрос:**
```graphql
query {
    group_user(order_by: {createdAt: desc}) {
        id
        createdAt
        updatedAt
        group {
            id
            status
            path
            campus
        }
        user {
            id
            login
            campus
        }
    }
}
```

**Запуск:**
```bash
python3 group_user_query.py
```

**Результат:** `group_user_results_YYYYMMDD_HHMMSS.json`

### 3. combined_query.py
Выполняет оба запроса и объединяет данные по группам.

**Запуск:**
```bash
python3 combined_query.py
```

**Результат:** `combined_results_YYYYMMDD_HHMMSS.json`

## Структура данных

### Audit данные
- `id` - ID аудита
- `grade` - Оценка (может быть null)
- `createdAt` - Дата создания
- `group` - Информация о группе
  - `id` - ID группы
  - `status` - Статус группы
  - `path` - Путь группы

### Group User данные
- `id` - ID связи пользователя с группой
- `createdAt` - Дата создания
- `updatedAt` - Дата обновления
- `group` - Информация о группе
  - `id` - ID группы
  - `status` - Статус группы
  - `path` - Путь группы
  - `campus` - Кампус
- `user` - Информация о пользователе
  - `id` - ID пользователя
  - `login` - Логин пользователя
  - `campus` - Кампус пользователя

### Combined данные
Объединяет audit и group_user данные по ID группы:
```json
{
  "audit": { /* данные аудита */ },
  "group_users": [ /* массив пользователей в группе */ ]
}
```

## Примеры использования

### Получить все аудиты
```bash
export TOMORROW_SCHOOL_USERNAME="your_username"
export TOMORROW_SCHOOL_PASSWORD="your_password"
python3 audit_query.py
```

### Получить связи пользователей с группами
```bash
export TOMORROW_SCHOOL_USERNAME="your_username"
export TOMORROW_SCHOOL_PASSWORD="your_password"
python3 group_user_query.py
```

### Получить объединенные данные
```bash
export TOMORROW_SCHOOL_USERNAME="your_username"
export TOMORROW_SCHOOL_PASSWORD="your_password"
python3 combined_query.py
```

## Связи между таблицами

Согласно схеме базы данных:

1. **audit** → **group** (через `groupId`)
2. **group_user** → **group** (через `groupId`)
3. **group_user** → **user** (через `userId`)

Это позволяет объединять данные аудитов с информацией о пользователях в группах.

## Файлы результатов

Все результаты сохраняются в JSON файлы с временными метками:
- `audit_results_YYYYMMDD_HHMMSS.json`
- `group_user_results_YYYYMMDD_HHMMSS.json`
- `combined_results_YYYYMMDD_HHMMSS.json`

Файлы содержат структурированные данные, готовые для анализа или импорта в другие системы.

