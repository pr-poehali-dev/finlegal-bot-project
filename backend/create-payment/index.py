import json
import os
import urllib.parse


def handler(event: dict, context) -> dict:
    """Формирование ссылки на оплату через YooMoney (СБП и карты)"""
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

    body = {}
    try:
        raw_body = event.get('body') or '{}'
        body = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
    except (json.JSONDecodeError, TypeError):
        body = {}

    amount = body.get('amount')
    description = body.get('description', 'Юридическая услуга')

    if not amount or float(amount) < 1:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Invalid amount'})}

    wallet = os.environ.get('YOOMONEY_WALLET', '')
    if not wallet:
        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': 'Payment not configured'})}

    params = {
        'receiver': wallet,
        'quickpay-form': 'shop',
        'targets': description[:128],
        'paymentType': 'AC',
        'sum': f"{float(amount):.2f}",
        'successURL': body.get('return_url', ''),
    }

    payment_url = f"https://yoomoney.ru/quickpay/confirm.xml?{urllib.parse.urlencode(params)}"

    return {
        'statusCode': 200,
        'headers': cors,
        'body': json.dumps({
            'payment_url': payment_url,
        }),
    }
