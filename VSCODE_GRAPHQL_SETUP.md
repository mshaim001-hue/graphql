# Настройка VS Code GraphQL расширения для Tomorrow School API

## 📋 Шаги настройки

### 1. Установите расширение
1. Откройте VS Code
2. Перейдите в Extensions (Ctrl+Shift+X)
3. Найдите "GraphQL" от Prisma
4. Установите расширение

### 2. Получите JWT токен
1. Откройте ваше приложение в браузере
2. Войдите в систему
3. Откройте Developer Tools (F12)
4. Перейдите в Application/Storage → Local Storage
5. Найдите ключ `jwt` и скопируйте значение

### 3. Настройте переменную окружения
Создайте файл `.env` в корне проекта:
```bash
GRAPHQL_TOKEN=ваш_jwt_токен_здесь
```

Или установите переменную окружения:
```bash
export GRAPHQL_TOKEN="ваш_jwt_токен_здесь"
```

### 4. Откройте проект в VS Code
1. Откройте папку проекта в VS Code
2. Убедитесь, что файл `.graphqlrc.yml` находится в корне
3. В статус-баре VS Code должна появиться иконка "🔌 graphql"

## 🚀 Как использовать

### Выполнение запросов
1. Откройте файл `queries.graphql`
2. Поместите курсор на любой запрос
3. Нажмите `Ctrl+Shift+P` и выберите "GraphQL: Execute Query"
4. Или используйте кнопку "Execute" над запросом

### Автодополнение
- Начните печатать запрос - VS Code предложит автодополнение
- Нажмите `Ctrl+Space` для принудительного автодополнения

### Валидация
- VS Code будет подсвечивать ошибки в запросах
- Покажет подсказки при наведении на поля

### Переменные
- Используйте файл `variables.json` для передачи переменных
- Или передавайте переменные через интерфейс выполнения

## 🔍 Отладка проблем с аудитами

### Запрос для анализа аудита
```graphql
query AnalyzeAuditData($auditId: Int!) {
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
```

### Переменные для отладки
```json
{
  "auditId": 13151
}
```

## 📊 Полезные запросы

### 1. Проверить связь audit → result
```graphql
query CheckAuditResultConnection {
  audit(limit: 5) {
    id
    resultId
    result {
      id
      object {
        name
      }
    }
  }
}
```

### 2. Проверить все результаты
```graphql
query CheckAllResults {
  result(limit: 10) {
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
```

### 3. Проверить объекты
```graphql
query CheckObjects {
  object(limit: 20) {
    id
    name
    type
    authorId
  }
}
```

## 🛠️ Решение проблем

### Ошибка "PersistedQueryNotSupported"
- Убедитесь, что используете правильный endpoint
- Проверьте заголовки авторизации

### Ошибка авторизации
- Обновите JWT токен в переменной окружения
- Проверьте, что токен не истек

### Нет автодополнения
- Убедитесь, что файл `.graphqlrc.yml` в корне проекта
- Перезапустите VS Code
- Проверьте, что расширение активно (иконка в статус-баре)

## 📝 Советы

1. **Используйте фрагменты** для переиспользования полей
2. **Создавайте переменные** для параметров запросов
3. **Сохраняйте полезные запросы** в файле `queries.graphql`
4. **Используйте автодополнение** для изучения схемы API
