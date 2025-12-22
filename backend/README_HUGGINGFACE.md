# Деплой на Hugging Face Spaces

Этот файл содержит инструкции по деплою FastAPI backend на Hugging Face Spaces.

## Требования

- Аккаунт на [Hugging Face](https://huggingface.co)
- Проект должен быть в Git репозитории (GitHub, GitLab и т.д.)

## Шаги деплоя

### 1. Создание Space на Hugging Face

1. Перейдите на [Hugging Face Spaces](https://huggingface.co/spaces)
2. Нажмите "Create new Space"
3. Заполните форму:
   - **Space name**: `reverse-gantt-backend` (или любое другое имя)
   - **SDK**: выберите **Docker**
   - **Hardware**: можно оставить бесплатный (CPU basic) или выбрать GPU если нужно
   - **Visibility**: Public или Private на ваш выбор

### 2. Подключение репозитория

Hugging Face Spaces поддерживает несколько способов:

**Вариант A: Прямой Git push (рекомендуется)**
```bash
# Клонируйте Space репозиторий
git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
cd YOUR_SPACE_NAME

# Скопируйте содержимое папки backend в клонированный репозиторий
cp -r /path/to/your/project/backend/* .

# Закоммитьте и запушьте
git add .
git commit -m "Deploy FastAPI backend"
git push
```

**Вариант B: Использовать существующий репозиторий**
- Настройте Git sync в настройках Space
- Или используйте GitHub Actions для автоматического деплоя

### 3. Настройка переменных окружения

В настройках Space (Settings → Variables and secrets) добавьте:

- `SECRET_KEY`: случайная строка для JWT (например, сгенерируйте через `openssl rand -hex 32`)
- `DATABASE_URL`: (опционально) для внешней БД. Если не указан, будет использоваться SQLite в `/tmp/app.db`
- `FRONTEND_URL`: URL вашего frontend (Vercel или другой), например `https://your-app.vercel.app`

**Важно**: На Hugging Face Spaces можно писать только в директорию `/tmp`. Если используете SQLite, данные не сохраняются между перезапусками. Для продакшена рекомендуется внешняя БД (PostgreSQL, например через Neon.tech, Supabase, или другой провайдер).

### 4. Структура файлов

Убедитесь, что в корне Space (или backend папки) есть:

- `app.py` - точка входа для Hugging Face Spaces
- `Dockerfile` - инструкции для сборки Docker образа
- `requirements.txt` - зависимости Python
- Папка `app/` - основной код приложения

### 5. Деплой

После push изменений Hugging Face Spaces автоматически:
1. Соберет Docker образ
2. Установит зависимости из `requirements.txt`
3. Запустит приложение на порту 7860

Процесс можно отслеживать на вкладке "Logs" в интерфейсе Space.

### 6. Проверка работы

После успешного деплоя приложение будет доступно по адресу:
```
https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space
```

API документация (Swagger UI) будет доступна по адресу:
```
https://YOUR_USERNAME-YOUR_SPACE_NAME.hf.space/docs
```

## Особенности Hugging Face Spaces

### Ограничения

1. **Файловая система**: Можно писать только в `/tmp`. Все остальные директории read-only.
2. **Персистентность данных**: Данные в `/tmp` не сохраняются между перезапусками.
3. **Сетевой трафик**: Ограничения на исходящие запросы к внешним API.
4. **Ресурсы**: На бесплатном тарифе ограниченные CPU/RAM ресурсы.

### Рекомендации

1. **База данных**: Используйте внешнюю БД (PostgreSQL через Neon.tech, Supabase, или другой провайдер) вместо SQLite.
2. **Переменные окружения**: Храните секреты (SECRET_KEY, DATABASE_URL) в Variables and secrets, не коммитьте их в код.
3. **CORS**: Убедитесь, что `FRONTEND_URL` правильно настроен в переменных окружения для работы с frontend.

## Обновление приложения

Для обновления приложения просто закоммитьте и запушьте изменения в Space репозиторий. Hugging Face Spaces автоматически пересоберет и перезапустит приложение.

## Troubleshooting

- **Ошибка при сборке**: Проверьте логи на вкладке "Logs"
- **CORS ошибки**: Убедитесь, что `FRONTEND_URL` правильно настроен
- **Проблемы с БД**: Убедитесь, что путь к БД правильный и директория доступна для записи (`/tmp`)

## Примеры

### Использование внешней PostgreSQL базы данных

В переменных окружения укажите:
```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### Локальная разработка с той же структурой

Для локальной разработки используйте:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Для тестирования Docker образа локально:
```bash
cd backend
docker build -t reverse-gantt-backend .
docker run -p 7860:7860 -e SECRET_KEY=your-secret-key reverse-gantt-backend
```



