import json
import os
import hashlib
import secrets
import smtplib
import base64
import io
from email.mime.text import MIMEText
import urllib.request
import urllib.error
import boto3
import psycopg2
from botocore.exceptions import ClientError
from PyPDF2 import PdfReader
from docx import Document


NOTIFY_EMAIL = 'f18887268@gmail.com'


def send_email_notification(subject, body_text):
    app_password = os.environ.get('GMAIL_APP_PASSWORD', '')
    if not app_password:
        return
    try:
        msg = MIMEText(body_text, 'plain', 'utf-8')
        msg['Subject'] = subject
        msg['From'] = NOTIFY_EMAIL
        msg['To'] = NOTIFY_EMAIL
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10) as smtp:
            smtp.login(NOTIFY_EMAIL, app_password.replace(' ', ''))
            smtp.send_message(msg)
    except Exception:
        pass


CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
}


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def load_json_s3(s3, key):
    try:
        resp = s3.get_object(Bucket='files', Key=key)
        return json.loads(resp['Body'].read().decode('utf-8'))
    except ClientError as e:
        if e.response['Error']['Code'] in ('NoSuchKey', '404'):
            return {}
        raise


def save_json_s3(s3, key, data):
    s3.put_object(Bucket='files', Key=key, Body=json.dumps(data).encode('utf-8'), ContentType='application/json')


def hash_password(password: str) -> str:
    return hashlib.sha256(f'jurbot_v1:{password}'.encode('utf-8')).hexdigest()


def normalize_phone(phone: str) -> str:
    digits = ''.join(c for c in phone if c.isdigit())
    if digits.startswith('8') and len(digits) == 11:
        digits = '7' + digits[1:]
    if not digits.startswith('7'):
        digits = '7' + digits
    return digits[:11]


def ok(body):
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(body)}


def err(status, msg):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps({'error': msg})}


def handle_register(body, s3):
    phone = normalize_phone(body.get('phone') or '')
    name = (body.get('name') or '').strip()
    password = body.get('password') or ''

    if len(phone) != 11:
        return err(400, 'Введите корректный номер телефона')
    if not name:
        return err(400, 'Введите ваше имя')
    if len(password) < 6:
        return err(400, 'Пароль — минимум 6 символов')

    users = load_json_s3(s3, 'auth/users.json')
    if phone in users:
        return err(409, 'Этот номер уже зарегистрирован')

    users[phone] = {
        'id': secrets.token_hex(8),
        'phone': phone,
        'name': name,
        'password_hash': hash_password(password),
    }
    save_json_s3(s3, 'auth/users.json', users)

    token = secrets.token_hex(32)
    sessions = load_json_s3(s3, 'auth/sessions.json')
    sessions[token] = phone
    save_json_s3(s3, 'auth/sessions.json', sessions)

    return ok({'token': token, 'user': {'id': users[phone]['id'], 'phone': phone, 'name': name}})


def handle_login(body, s3):
    phone = normalize_phone(body.get('phone') or '')
    password = body.get('password') or ''

    if len(phone) != 11 or not password:
        return err(400, 'Введите номер телефона и пароль')

    users = load_json_s3(s3, 'auth/users.json')
    user = users.get(phone)
    if not user or user['password_hash'] != hash_password(password):
        return err(401, 'Неверный номер или пароль')

    token = secrets.token_hex(32)
    sessions = load_json_s3(s3, 'auth/sessions.json')
    sessions[token] = phone
    save_json_s3(s3, 'auth/sessions.json', sessions)

    return ok({'token': token, 'user': {'id': user['id'], 'phone': user['phone'], 'name': user['name']}})


def handle_me(event, s3):
    headers = event.get('headers', {})
    session_id = headers.get('X-Session-Id') or headers.get('x-session-id', '')
    if not session_id:
        return err(401, 'Не авторизован')

    sessions = load_json_s3(s3, 'auth/sessions.json')
    phone = sessions.get(session_id)
    if not phone:
        return err(401, 'Сессия истекла')

    users = load_json_s3(s3, 'auth/users.json')
    user = users.get(phone)
    if not user:
        return err(401, 'Пользователь не найден')

    return ok({'id': user['id'], 'phone': user['phone'], 'name': user['name']})


def get_user_by_session(event, s3):
    headers = event.get('headers', {})
    session_id = headers.get('X-Session-Id') or headers.get('x-session-id', '')
    if not session_id:
        return None, None, session_id
    sessions = load_json_s3(s3, 'auth/sessions.json')
    phone = sessions.get(session_id)
    if not phone:
        return None, None, session_id
    users = load_json_s3(s3, 'auth/users.json')
    user = users.get(phone)
    return user, phone, session_id


def handle_update_profile(event, body, s3):
    user, phone, _ = get_user_by_session(event, s3)
    if not user:
        return err(401, 'Не авторизован')

    new_name = (body.get('name') or '').strip()
    new_password = body.get('new_password')

    if new_name and len(new_name) < 2:
        return err(400, 'Имя слишком короткое')

    if new_password is not None and len(new_password) < 6:
        return err(400, 'Пароль — минимум 6 символов')

    users = load_json_s3(s3, 'auth/users.json')
    if new_name:
        users[phone]['name'] = new_name
    if new_password:
        users[phone]['password_hash'] = hash_password(new_password)

    save_json_s3(s3, 'auth/users.json', users)
    return ok({'user': {'id': users[phone]['id'], 'phone': phone, 'name': users[phone]['name']}})


def handle_delete_account(event, s3):
    user, phone, session_id = get_user_by_session(event, s3)
    if not user:
        return err(401, 'Не авторизован')

    users = load_json_s3(s3, 'auth/users.json')
    users.pop(phone, None)
    save_json_s3(s3, 'auth/users.json', users)

    sessions = load_json_s3(s3, 'auth/sessions.json')
    to_remove = [k for k, v in sessions.items() if v == phone]
    for k in to_remove:
        sessions.pop(k, None)
    save_json_s3(s3, 'auth/sessions.json', sessions)

    return ok({'ok': True})


def handle_user_stats(event, s3):
    user, phone, _ = get_user_by_session(event, s3)
    if not user:
        return err(401, 'Не авторизован')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*), COALESCE(SUM(amount),0) FROM orders WHERE user_phone = %s", (phone,))
            row = cur.fetchone()
            total_orders = row[0]
            total_spent = float(row[1])
            cur.execute("SELECT COUNT(*) FROM orders WHERE user_phone = %s AND status = 'paid'", (phone,))
            completed = cur.fetchone()[0]
    finally:
        conn.close()
    return ok({'orders': total_orders, 'spent': total_spent, 'completed': completed})


def handle_user_orders(event, s3):
    user, phone, _ = get_user_by_session(event, s3)
    if not user:
        return err(401, 'Не авторизован')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, service_name, amount, status, created_at, paid_at FROM orders WHERE user_phone = %s ORDER BY created_at DESC LIMIT 50",
                (phone,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()
    items = []
    for r in rows:
        items.append({
            'id': r[0], 'service': r[1], 'amount': float(r[2]) if r[2] else 0,
            'status': r[3], 'created_at': str(r[4]) if r[4] else None,
            'paid_at': str(r[5]) if r[5] else None,
        })
    return ok({'items': items})


def handle_support_ticket(body):
    message = (body.get('message') or '').strip()
    phone = (body.get('phone') or '').strip()
    name = (body.get('name') or '').strip()

    if not message:
        return err(400, 'Сообщение не может быть пустым')

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO support_tickets (user_phone, user_name, message, status) VALUES (%s, %s, %s, %s)",
                (phone, name, message, 'new'),
            )
        conn.commit()
    finally:
        conn.close()

    send_email_notification(
        f'��рБот: новое обращение от {name or phone or "аноним"}',
        f'Имя: {name}\nТелефон: {phone}\n\nСообщение:\n{message}',
    )

    return ok({'ok': True})


def handle_create_order(body):
    phone = (body.get('phone') or '').strip()
    service_name = (body.get('service_name') or '').strip()
    amount = body.get('amount', 0)

    if not service_name or not amount:
        return err(400, 'Укажите название услуги и сумму')

    payment_label = secrets.token_hex(16)

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO orders (user_phone, service_name, amount, status, payment_label) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (phone, service_name, float(amount), 'pending', payment_label),
            )
            order_id = cur.fetchone()[0]
        conn.commit()
    finally:
        conn.close()

    return ok({'order_id': order_id, 'payment_label': payment_label})


def handle_confirm_payment(body):
    order_id = body.get('order_id')
    if not order_id:
        return err(400, 'Укажите order_id')

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = %s",
                (int(order_id),),
            )
        conn.commit()
    finally:
        conn.close()

    return ok({'ok': True})


def handle_check_order(body):
    order_id = body.get('order_id')
    if not order_id:
        return err(400, 'Укажите order_id')

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, user_phone, service_name, amount, status, payment_label, result, created_at, paid_at FROM orders WHERE id = %s",
                (int(order_id),),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        return err(404, 'Заказ не найден')

    return ok({
        'id': row[0],
        'user_phone': row[1],
        'service_name': row[2],
        'amount': float(row[3]) if row[3] else 0,
        'status': row[4],
        'payment_label': row[5],
        'result': row[6],
        'created_at': str(row[7]) if row[7] else None,
        'paid_at': str(row[8]) if row[8] else None,
    })


def _extract_text_from_binary(fname, b64_content):
    fname_lower = fname.lower()
    try:
        raw = base64.b64decode(b64_content)
        buf = io.BytesIO(raw)

        if fname_lower.endswith('.pdf'):
            reader = PdfReader(buf)
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            if not pages:
                return '[PDF-файл не содержит извлекаемого текста (возможно, отсканированный документ)]'
            return '\n\n'.join(pages)

        if fname_lower.endswith('.docx'):
            doc = Document(buf)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            if not paragraphs:
                return '[DOCX-файл пустой или не содержит текста]'
            return '\n'.join(paragraphs)

        if fname_lower.endswith('.doc'):
            return '[Формат .doc (старый Word) не поддерживается. Пожалуйста, сохраните файл как .docx]'

        return '[Неподдерживаемый бинарный формат]'
    except Exception as e:
        return f'[Ошибка при чтении файла: {str(e)[:200]}]'


SERVICE_PROMPTS = {
    'Экспресс-проверка договора': (
        "Услуга: Экспресс-проверка договора.\n"
        "Задача: быстро проверить договор, выявить явные риски, кабальные условия, "
        "несоответствия законодательству РФ. Дай краткое заключение с пометками «⚠️ Риск» для проблемных пунктов."
    ),
    'Полный анализ договора': (
        "Услуга: Полный анализ договора.\n"
        "Задача: детальный постатейный анализ. По каждому разделу: описание, риски, рекомендации по исправлению. "
        "Отметь соответствие ГК РФ, ЗоЗПП и другим применимым законам. Дай итоговое заключение."
    ),
    'Анализ сложного контракта': (
        "Услуга: Анализ сложного контракта.\n"
        "Задача: глубокий экспертный анализ сложного контракта (корпоративные, международные, инвестиционные). "
        "Анализируй перекрёстные ссылки, приложения, условия расторжения, форс-мажор, арбитражные оговорки. "
        "Дай развёрнутое экспертное заключение."
    ),
    'Комплексная экспертиза пакета': (
        "Услуга: Комплексная экспертиза пакета документов.\n"
        "Задача: полная экспертиза пакета связанных документов. Проверь взаимосвязи, противоречия между документами, "
        "юридическую целостность пакета. Дай сводный отчёт и рекомендации."
    ),
    'Устная консультация': (
        "Услуга: Устная консультация.\n"
        "Задача: дай чёткий, понятный ответ на вопрос пользователя. "
        "Ссылайся на конкретные статьи законов РФ. Объясняй простым языком."
    ),
    'Письменное заключение': (
        "Услуга: Письменное заключение.\n"
        "Задача: подготовь структурированное письменное заключение. Формат: "
        "1) Суть вопроса, 2) Применимые нормы, 3) Анализ, 4) Выводы и рекомендации. "
        "Пиши в формальном стиле, пригодном для официального использования."
    ),
    'Правовой анализ ситуации': (
        "Услуга: Правовой анализ ситуации.\n"
        "Задача: комплексный анализ правовой ситуации. Рассмотри все стороны, возможные сценарии развития, "
        "судебную практику. Дай пошаговый план действий с оценкой рисков каждого варианта."
    ),
    'Стратегическое консультирование': (
        "Услуга: Стратегическое консультирование.\n"
        "Задача: разработай правовую стратегию. Учти бизнес-контекст, долгосрочные риски, "
        "налоговые последствия, регуляторные требования. Предложи несколько стратегий с pros/cons."
    ),
    'Типовой документ': (
        "Услуга: Подготовка типового документа.\n"
        "Задача: составь юридический документ по запросу (договор, заявление, претензия, доверенность и т.д.). "
        "Используй актуальные шаблоны, соответствующие законодательству РФ. Все поля должны быть заполнены или отмечены как [заполнить]."
    ),
    'Нестандартный документ': (
        "Услуга: Подготовка нестандартного документа.\n"
        "Задача: составь документ по индивидуальным требованиям. Учти специфику ситуации, "
        "нестандартные условия. Объясни логику каждого пункта."
    ),
    'Пакет юридических документов': (
        "Услуга: Подготовка пакета юридических документов.\n"
        "Задача: подготовь комплект взаимосвязанных документов. Обеспечь согласованность между документами, "
        "единую терминологию, перекрёстные ссылки."
    ),
    'Полный комплект под проект': (
        "Услуга: Полный комплект документов под проект.\n"
        "Задача: разработай полный пакет документации для проекта. Учти все этапы, стороны, "
        "регуляторные требования. Включи чек-лист для проверки комплектности."
    ),
}


def _build_system_prompt(service, files, paid):
    """Собрать системный промпт в зависимости от услуги"""
    base = (
        "Ты — профессиональный финансово-юридический помощник ЮрБот. "
        "Отвечай на русском языке, кратко, по делу, структурированно. "
        "Используй списки и выделение где уместно. "
        "Если вопрос выходит за рамки компетенции — честно сообщи об этом."
    )

    service_block = SERVICE_PROMPTS.get(service, '')
    if service_block:
        base += f"\n\n{service_block}"
    elif service:
        base += f"\nПользователь выбрал услугу: {service}. Учитывай это в ответах."

    if files and not paid:
        base += (
            "\n\nПользователь загрузил файлы, но НЕ оплатил услугу. "
            "Проведи КРАТКИЙ предварительный обзор: тип документа, объём, основные разделы. "
            "В конце напиши: «Для получения полного анализа необходимо оплатить услугу.»"
        )
    elif files and paid:
        base += (
            "\n\nПользователь загрузил файлы и ОПЛАТИЛ услугу. "
            "Выполни услугу ПОЛНОСТЬЮ по загруженным документам. "
            "Будь максимально детален и полезен."
        )

    return base


def _call_google_gemini(system_prompt, messages):
    """Вызвать Gemini через Google AI Studio напрямую"""
    import time as _time
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if not api_key:
        return None, 'GEMINI_API_KEY not configured'

    contents = []
    for msg in messages:
        role = msg.get("role", "user")
        if role == "assistant":
            role = "model"
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

    payload = json.dumps({
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {"maxOutputTokens": 2048, "temperature": 0.7},
    }).encode('utf-8')

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

    last_error = None
    for attempt in range(3):
        if attempt > 0:
            _time.sleep(2 * attempt)
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=55) as resp:
                data = json.loads(resp.read().decode('utf-8'))
            candidates = data.get('candidates', [])
            if not candidates:
                return None, 'AI не вернул ответ. Попробуйте переформулировать вопрос.'
            parts = candidates[0].get('content', {}).get('parts', [])
            reply = ''.join(p.get('text', '') for p in parts)
            if reply:
                return reply.strip(), None
            return None, 'AI не вернул ответ. Попробуйте переформулировать вопрос.'
        except urllib.error.HTTPError as e:
            error_body = ''
            try:
                error_body = e.read().decode('utf-8') if e.fp else ''
            except Exception:
                pass
            print(f'Google Gemini attempt {attempt+1} HTTPError {e.code}: {error_body[:300]}')
            if e.code == 429:
                last_error = 'rate_limit'
                continue
            if e.code in (401, 403):
                return None, 'google_auth_error'
            return None, f'AI временно недоступен (код {e.code})'
        except Exception as e:
            print(f'Google Gemini attempt {attempt+1} error: {type(e).__name__}: {str(e)[:200]}')
            last_error = str(e)
            continue

    return None, last_error or 'Google Gemini недоступен'


def _call_openrouter(system_prompt, messages):
    """Вызвать Gemini через OpenRouter (fallback)"""
    api_key = os.environ.get('QWEN_API_KEY', '')
    if not api_key:
        return None, 'QWEN_API_KEY not configured'

    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        api_messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    payload = json.dumps({
        "model": "google/gemini-2.0-flash:free",
        "messages": api_messages,
        "max_tokens": 2048,
        "temperature": 0.7,
    }).encode('utf-8')

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(req, timeout=55) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = ''
        try:
            error_body = e.read().decode('utf-8') if e.fp else ''
        except Exception:
            pass
        print(f'OpenRouter HTTPError {e.code}: {error_body[:300]}')
        return None, f'OpenRouter error {e.code}'
    except Exception as e:
        print(f'OpenRouter error: {type(e).__name__}: {str(e)[:200]}')
        return None, str(e)

    reply = data.get('choices', [{}])[0].get('message', {}).get('content', '')
    if not reply:
        return None, 'OpenRouter пустой ответ'
    return reply.strip(), None


def _call_gemini(system_prompt, messages):
    """Вызвать AI: сначала Google Gemini, при ошибке — OpenRouter"""
    reply, error = _call_google_gemini(system_prompt, messages)
    if reply:
        return reply, None

    print(f'Google Gemini failed ({error}), trying OpenRouter fallback...')
    reply2, error2 = _call_openrouter(system_prompt, messages)
    if reply2:
        return reply2, None

    print(f'OpenRouter fallback also failed: {error2}')
    if error == 'rate_limit':
        return None, 'AI перегружен. Подождите минуту и попробуйте снова.'
    if error == 'google_auth_error':
        return None, 'Ключ AI-сервиса недействителен. Обратитесь к администратору.'
    return None, 'AI временно недоступен. Попробуйте через минуту.'


def handle_chat(body):
    """Чат с AI-ассистентом ЮрБот на базе Gemini 2.0 Flash (Google AI)"""
    messages = body.get('messages', [])
    service = body.get('service', '')
    files = body.get('files', [])
    paid = body.get('paid', False)

    if not messages:
        return err(400, 'No messages')

    if files and messages:
        last_msg = messages[-1]
        file_block = ""
        for f in files:
            fname = f.get('name', 'file')
            fcontent = f.get('content', '')
            encoding = f.get('encoding', '')

            if encoding == 'base64':
                fcontent = _extract_text_from_binary(fname, fcontent)

            if len(fcontent) > 50000:
                fcontent = fcontent[:50000] + '\n... (текст обрезан, файл слишком большой)'
            file_block += f'[Содержимое файла "{fname}":]\n{fcontent}\n\n'

        user_text = last_msg.get('content', '')
        combined_content = file_block + f"[Пользователь спрашивает:]\n{user_text}"

        messages = list(messages)
        messages[-1] = dict(messages[-1])
        messages[-1]['content'] = combined_content

    system_prompt = _build_system_prompt(service, files, paid)

    chat_messages = []
    for msg in messages[-10:]:
        chat_messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    reply, error = _call_gemini(system_prompt, chat_messages)
    if error:
        return err(502, error)

    return ok({'reply': reply})


def handle_list_tickets(body):
    limit = min(int(body.get('limit', 50)), 200)
    offset = int(body.get('offset', 0))
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, user_phone, user_name, message, status, created_at FROM support_tickets ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (limit, offset),
            )
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) FROM support_tickets")
            total = cur.fetchone()[0]
    finally:
        conn.close()
    items = []
    for r in rows:
        items.append({
            'id': r[0], 'phone': r[1], 'name': r[2],
            'message': r[3], 'status': r[4],
            'created_at': str(r[5]) if r[5] else None,
        })
    return ok({'items': items, 'total': total})


def handle_list_orders(body):
    limit = min(int(body.get('limit', 50)), 200)
    offset = int(body.get('offset', 0))
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, user_phone, service_name, amount, status, payment_label, created_at, paid_at FROM orders ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (limit, offset),
            )
            rows = cur.fetchall()
            cur.execute("SELECT COUNT(*) FROM orders")
            total = cur.fetchone()[0]
    finally:
        conn.close()
    items = []
    for r in rows:
        items.append({
            'id': r[0], 'phone': r[1], 'service': r[2],
            'amount': float(r[3]) if r[3] else 0, 'status': r[4],
            'label': r[5], 'created_at': str(r[6]) if r[6] else None,
            'paid_at': str(r[7]) if r[7] else None,
        })
    return ok({'items': items, 'total': total})


def handle_update_ticket(body):
    ticket_id = body.get('ticket_id')
    status = body.get('status', '')
    if not ticket_id or status not in ('new', 'in_progress', 'resolved', 'closed'):
        return err(400, 'Укажите ticket_id и корректный status')
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE support_tickets SET status = %s WHERE id = %s", (status, int(ticket_id)))
        conn.commit()
    finally:
        conn.close()
    return ok({'ok': True})


def check_admin(body):
    password = (body.get('admin_password') or '').strip()
    expected = os.environ.get('ADMIN_PASSWORD', '')
    if not expected or password != expected:
        return False
    return True


def handler(event: dict, context) -> dict:
    """API: чат, авторизация, поддержка, заказы, профиль, админка"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method != 'POST':
        return err(405, 'Method not allowed')

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except (json.JSONDecodeError, TypeError):
            body = {}

    action = body.get('action', 'chat')

    if action == 'register':
        s3 = get_s3()
        return handle_register(body, s3)

    if action == 'login':
        s3 = get_s3()
        return handle_login(body, s3)

    if action == 'me':
        s3 = get_s3()
        return handle_me(event, s3)

    if action == 'update_profile':
        s3 = get_s3()
        return handle_update_profile(event, body, s3)

    if action == 'delete_account':
        s3 = get_s3()
        return handle_delete_account(event, s3)

    if action == 'user_stats':
        s3 = get_s3()
        return handle_user_stats(event, s3)

    if action == 'user_orders':
        s3 = get_s3()
        return handle_user_orders(event, s3)

    if action == 'support_ticket':
        return handle_support_ticket(body)

    if action == 'create_order':
        return handle_create_order(body)

    if action == 'confirm_payment':
        return handle_confirm_payment(body)

    if action == 'check_order':
        return handle_check_order(body)

    if action == 'admin_auth':
        if check_admin(body):
            return ok({'ok': True})
        return err(403, 'Неверный пароль')

    if action == 'list_tickets':
        if not check_admin(body):
            return err(403, 'Доступ запрещён')
        return handle_list_tickets(body)

    if action == 'list_orders':
        if not check_admin(body):
            return err(403, 'Доступ запрещён')
        return handle_list_orders(body)

    if action == 'update_ticket':
        if not check_admin(body):
            return err(403, 'Доступ запрещён')
        return handle_update_ticket(body)

    return handle_chat(body)