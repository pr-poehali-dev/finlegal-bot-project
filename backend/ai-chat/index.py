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


import re

SERVICE_PRICES = {
    'Экспресс-проверка договора': 1000,
    'Полный анализ договора': 3000,
    'Анализ сложного контракта': 8000,
    'Комплексная экспертиза пакета': 20000,
    'Устная консультация': 1000,
    'Письменное заключение': 3000,
    'Правовой анализ ситуации': 10000,
    'Стратегическое консультирование': 30000,
    'Типовой документ': 2000,
    'Нестандартный документ': 5000,
    'Пакет юридических документов': 15000,
    'Полный комплект под проект': 50000,
}


def _count_pages(text):
    lines = text.strip().split('\n')
    chars = len(text)
    pages = max(1, round(chars / 2000))
    return pages, len(lines), chars


def _detect_doc_type(text):
    t = text.lower()
    patterns = {
        'договор': ['договор', 'контракт', 'соглашение', 'стороны именуемые', 'предмет договора'],
        'доверенность': ['доверенность', 'уполномочивает', 'настоящей доверенностью'],
        'исковое заявление': ['исковое заявление', 'истец', 'ответчик', 'прошу суд'],
        'претензия': ['претензия', 'требую', 'досудебн'],
        'акт': ['акт приёма', 'акт приема', 'акт выполненных', 'акт сверки'],
        'устав': ['устав', 'учредитель', 'уставный капитал'],
        'протокол': ['протокол', 'собрание', 'слушали', 'постановили'],
        'приказ': ['приказ', 'приказываю', 'основание'],
        'заявление': ['заявление', 'прошу', 'заявитель'],
        'счёт': ['счёт', 'счет-фактура', 'оплата', 'итого к оплате'],
        'отчёт': ['отчёт', 'отчет', 'показатели', 'результаты деятельности'],
        'финансовый документ': ['баланс', 'прибыль', 'убыток', 'актив', 'пассив', 'страхов', 'премии', 'выплаты', 'резерв'],
        'трудовой договор': ['трудовой договор', 'работник', 'работодатель', 'заработная плата'],
        'аренда': ['аренда', 'арендодатель', 'арендатор', 'арендная плата'],
        'купля-продажа': ['купли-продажи', 'купля-продажа', 'покупатель', 'продавец'],
        'страхование': ['страхов', 'полис', 'страхователь', 'выгодоприобретатель', 'страховой случай'],
        'практическая работа': ['практическ', 'задание', 'вариант', 'расчет', 'расчёт', 'задач'],
    }
    found = {}
    for dtype, keywords in patterns.items():
        count = sum(1 for kw in keywords if kw in t)
        if count > 0:
            found[dtype] = count
    if not found:
        return 'документ'
    return max(found, key=found.get)


def _extract_key_sections(text):
    sections = []
    lines = text.split('\n')
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if len(stripped) < 100 and (stripped.isupper() or stripped.endswith(':') or re.match(r'^(Раздел|Глава|Статья|Пункт|\d+\.)\s', stripped)):
            sections.append(stripped)
    return sections[:20]


def _extract_numbers(text):
    money_patterns = re.findall(r'(\d[\d\s.,]*)\s*(?:руб|₽|рубл|тыс|млн|р\.)', text)
    numbers = []
    for m in money_patterns:
        cleaned = m.replace(' ', '').replace(',', '.').replace('\xa0', '')
        try:
            val = float(cleaned)
            if val > 0:
                numbers.append(val)
        except ValueError:
            pass
    return numbers[:10]


def _extract_parties(text):
    parties = []
    patterns = [
        r'(?:именуем\w+|далее)\s*[«"—–-]\s*([^»"—–\n]{2,60})',
        r'(?:ООО|ОАО|ЗАО|АО|ИП|ПАО)\s*[«"]([^»"]{2,60})',
    ]
    for p in patterns:
        found = re.findall(p, text)
        parties.extend(found)
    return list(set(parties))[:6]


def _analyze_document(text, fname):
    doc_type = _detect_doc_type(text)
    pages, lines, chars = _count_pages(text)
    sections = _extract_key_sections(text)
    numbers = _extract_numbers(text)
    parties = _extract_parties(text)

    return {
        'type': doc_type,
        'filename': fname,
        'pages': pages,
        'lines': lines,
        'chars': chars,
        'sections': sections,
        'numbers': numbers,
        'parties': parties,
    }


def _format_analysis(analysis, service, paid):
    a = analysis
    price = SERVICE_PRICES.get(service, 1000)

    parts = []
    parts.append(f"📄 **Документ:** {a['filename']}")
    parts.append(f"📋 **Тип:** {a['type'].capitalize()}")
    parts.append(f"📐 **Объём:** ~{a['pages']} стр. ({a['chars']:,} символов, {a['lines']} строк)")

    if a['parties']:
        parts.append(f"👥 **Стороны:** {', '.join(a['parties'])}")

    if a['sections']:
        parts.append("\n**Основные разделы:**")
        for i, s in enumerate(a['sections'][:10], 1):
            parts.append(f"  {i}. {s}")

    if a['numbers']:
        formatted = [f"{n:,.0f} руб." if n >= 1 else str(n) for n in a['numbers'][:5]]
        parts.append(f"\n💰 **Суммы в документе:** {', '.join(formatted)}")

    if not paid:
        parts.append(f"\n---\n✅ Документ загружен и распознан. Для выполнения услуги \"{service}\" необходимо оплатить.\n\n**Стоимость: {price} ₽**")
    else:
        parts.append(f"\n---\n✅ Услуга \"{service}\" оплачена. Выполняю полный анализ.")
        parts.append(_generate_full_analysis(a, service))

    return '\n'.join(parts)


def _generate_full_analysis(a, service):
    parts = []

    if 'договор' in a['type'] or 'аренда' in a['type'] or 'купля' in a['type'] or 'трудовой' in a['type']:
        parts.append("\n\n**📌 Заключение по договору:**")
        parts.append(f"Тип документа: {a['type'].capitalize()}")
        if a['parties']:
            parts.append(f"Стороны: {', '.join(a['parties'])}")
        if a['sections']:
            parts.append(f"Структура включает {len(a['sections'])} разделов")
        parts.append("\n**Рекомендации:**")
        parts.append("• Проверьте корректность реквизитов сторон")
        parts.append("• Обратите внимание на сроки исполнения обязательств")
        parts.append("• Проверьте условия расторжения и ответственность сторон")
        if a['numbers']:
            parts.append("• Сверьте финансовые суммы в тексте и приложениях")

    elif 'финансов' in a['type'] or 'отчёт' in a['type'] or 'страхов' in a['type']:
        parts.append("\n\n**📊 Финансовый анализ:**")
        parts.append(f"Тип: {a['type'].capitalize()}")
        if a['numbers']:
            parts.append(f"Обнаружены финансовые показатели: {len(a['numbers'])} значений")
            total = sum(a['numbers'])
            parts.append(f"Общая сумма выявленных показателей: {total:,.0f} руб.")
        if a['sections']:
            parts.append(f"\nРазделы документа ({len(a['sections'])}):")
            for s in a['sections']:
                parts.append(f"  — {s}")

    elif 'практическ' in a['type']:
        parts.append("\n\n**📝 Анализ задания:**")
        parts.append(f"Тип: Практическая / расчётная работа")
        parts.append(f"Объём: ~{a['pages']} стр.")
        if a['sections']:
            parts.append("Задания/разделы:")
            for s in a['sections']:
                parts.append(f"  — {s}")
        if a['numbers']:
            parts.append(f"\nЧисловые данные: {', '.join(f'{n:,.0f}' for n in a['numbers'][:5])}")

    else:
        parts.append(f"\n\n**📝 Анализ документа ({a['type']}):**")
        if a['sections']:
            parts.append("Структура:")
            for s in a['sections']:
                parts.append(f"  — {s}")
        if a['numbers']:
            parts.append(f"Суммы: {', '.join(f'{n:,.0f} руб.' for n in a['numbers'][:5])}")

    parts.append("\n\n*Данный анализ выполнен автоматически на основе содержимого документа.*")
    return '\n'.join(parts)


def _handle_chat_without_files(messages, service):
    last = messages[-1].get('content', '').strip().lower() if messages else ''

    if not last:
        return "Здравствуйте! Опишите вашу задачу или загрузите документ для анализа."

    price = SERVICE_PRICES.get(service, 0)
    if service:
        return (
            f"Вы выбрали услугу: \"{service}\". "
            f"Пожалуйста, загрузите документы для анализа или опишите вашу задачу."
        )

    return (
        "Здравствуйте! Я — ЮрБот, финансово-юридический помощник. "
        "Выберите услугу на странице «Услуги» и загрузите документы для анализа. "
        "Я помогу с проверкой договоров, консультациями и подготовкой документов."
    )


def handle_chat(body):
    """Чат с ЮрБот — мгновенный анализ документов и расчёт стоимости"""
    messages = body.get('messages', [])
    service = body.get('service', '')
    files = body.get('files', [])
    paid = body.get('paid', False)

    if not messages:
        return err(400, 'No messages')

    if not files:
        reply = _handle_chat_without_files(messages, service)
        return ok({'reply': reply})

    all_analyses = []
    for f in files:
        fname = f.get('name', 'file')
        fcontent = f.get('content', '')
        encoding = f.get('encoding', '')

        if encoding == 'base64':
            fcontent = _extract_text_from_binary(fname, fcontent)

        if len(fcontent) > 50000:
            fcontent = fcontent[:50000]

        analysis = _analyze_document(fcontent, fname)
        all_analyses.append(analysis)

    if len(all_analyses) == 1:
        reply = _format_analysis(all_analyses[0], service, paid)
    else:
        parts = []
        for i, a in enumerate(all_analyses, 1):
            parts.append(f"### Файл {i}")
            parts.append(_format_analysis(a, service, paid))
        reply = '\n\n'.join(parts)

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