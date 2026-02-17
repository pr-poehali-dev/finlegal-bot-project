import json
import os
import uuid
import base64
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """Создание платежа через ЮKassa"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    cors = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}

    try:
        raw_body = event.get('body') or '{}'
        body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    except (json.JSONDecodeError, TypeError):
        body = {}

    amount = body.get('amount')
    description = body.get('description', 'Юридическая услуга')
    return_url = body.get('return_url', '')

    if not amount or float(amount) < 1:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Invalid amount'})}

    shop_id = os.environ.get('YUKASSA_SHOP_ID', '')
    secret_key = os.environ.get('YUKASSA_SECRET_KEY', '')

    if not shop_id or not secret_key:
        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': 'Payment not configured'})}

    auth = base64.b64encode(f"{shop_id}:{secret_key}".encode()).decode()
    idempotence_key = str(uuid.uuid4())

    payload = json.dumps({
        "amount": {
            "value": f"{float(amount):.2f}",
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": return_url or "https://example.com/thanks"
        },
        "capture": True,
        "description": description[:128],
    }).encode('utf-8')

    req = urllib.request.Request(
        "https://api.yookassa.ru/v3/payments",
        data=payload,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
            "Idempotence-Key": idempotence_key,
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        return {'statusCode': 502, 'headers': cors, 'body': json.dumps({'error': f'YooKassa error: {e.code}', 'detail': error_body})}
    except Exception as e:
        return {'statusCode': 502, 'headers': cors, 'body': json.dumps({'error': str(e)})}

    confirmation_url = data.get('confirmation', {}).get('confirmation_url', '')
    payment_id = data.get('id', '')
    status = data.get('status', '')

    return {
        'statusCode': 200,
        'headers': cors,
        'body': json.dumps({
            'payment_id': payment_id,
            'confirmation_url': confirmation_url,
            'status': status,
        }),
    }
