import json
import os
import hashlib
import secrets
import urllib.request
import urllib.error
import boto3
import psycopg2
from botocore.exceptions import ClientError


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


def handle_chat(body):
    messages = body.get('messages', [])
    service = body.get('service', '')
    files = body.get('files', [])
    paid = body.get('paid', False)

    if not messages:
        return err(400, 'No messages')

    system_prompt = (
        "Ты — профессиональный финансово-юридический помощник ЮрБот. "
        "Ты помогаешь пользователям с анализом договоров, консультациями по законодательству РФ, "
        "подготовкой документов и финансовым анализом. "
        "Отвечай кратко, по делу, структурированно. Используй списки и выделение где уместно. "
        "Если вопрос выходит за рамки компетенции — честно сообщи об этом."
    )
    if service:
        system_prompt += f"\nПользователь выбрал услугу: {service}. Учитывай это в ответах."

    if files and not paid:
        system_prompt += (
            "\n\nПользователь загрузил файлы, но НЕ оплатил услугу. "
            "Проведи КРАТКИЙ предварительный обзор файлов: укажи тип документа, объём, основные разделы. "
            "Назови примерную стоимость анализа в рублях (₽). "
            "В конце ОБЯЗАТЕЛЬНО напиши: «Для получения полного анализа необходимо оплатить услугу.»"
        )
    elif files and paid:
        system_prompt += (
            "\n\nПользователь загрузил файлы и ОПЛАТИЛ услугу. "
            "Проведи ПОЛНЫЙ детальный анализ всех предоставленных документов. "
            "Выяви риски, проблемы, дай рекомендации."
        )

    # Build the last user message with file contents if present
    if files and messages:
        last_msg = messages[-1]
        file_block = ""
        for f in files:
            fname = f.get('name', 'file')
            fcontent = f.get('content', '')
            file_block += f'[Содержимое файла "{fname}":]\n{fcontent}\n\n'

        user_text = last_msg.get('content', '')
        combined_content = file_block + f"[Пользователь спрашивает:]\n{user_text}"

        # Replace the last message content with combined version
        messages = list(messages)  # copy
        messages[-1] = dict(messages[-1])
        messages[-1]['content'] = combined_content

    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages[-10:]:
        api_messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    api_key = os.environ.get('QWEN_API_KEY', '')
    if not api_key:
        return err(500, 'API key not configured')

    payload = json.dumps({
        "model": "qwen/qwen3-235b-a22b",
        "messages": api_messages,
        "max_tokens": 1024,
        "temperature": 0.7,
    }).encode('utf-8')

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        return err(502, f'AI error: {e.code}')
    except Exception as e:
        return err(502, str(e))

    reply = data.get('choices', [{}])[0].get('message', {}).get('content', 'Не удалось получить ответ.')
    if reply.startswith('<think>'):
        think_end = reply.find('</think>')
        if think_end != -1:
            reply = reply[think_end + len('</think>'):].strip()

    return ok({'reply': reply})


def handler(event: dict, context) -> dict:
    """API: чат с ИИ, регистрация/вход, поддержка, заказы"""

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

    if action == 'support_ticket':
        return handle_support_ticket(body)

    if action == 'create_order':
        return handle_create_order(body)

    if action == 'confirm_payment':
        return handle_confirm_payment(body)

    if action == 'check_order':
        return handle_check_order(body)

    return handle_chat(body)