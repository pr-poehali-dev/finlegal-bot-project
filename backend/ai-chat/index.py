import json
import os
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """Чат-бот с Qwen AI для финансово-юридических консультаций"""
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
    messages = body.get('messages', [])
    service = body.get('service', '')

    if not messages:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'No messages'})}

    system_prompt = (
        "Ты — профессиональный финансово-юридический помощник ЮрБот. "
        "Ты помогаешь пользователям с анализом договоров, консультациями по законодательству РФ, "
        "подготовкой документов и финансовым анализом. "
        "Отвечай кратко, по делу, структурированно. Используй списки и выделение где уместно. "
        "Если пользователь загрузил файлы — предложи расчёт стоимости. "
        "Если вопрос выходит за рамки компетенции — честно сообщи об этом."
    )
    if service:
        system_prompt += f"\nПользователь выбрал услугу: {service}. Учитывай это в ответах."

    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages[-10:]:
        api_messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

    api_key = os.environ.get('QWEN_API_KEY', '')
    if not api_key:
        return {'statusCode': 500, 'headers': cors, 'body': json.dumps({'error': 'API key not configured'})}

    payload = json.dumps({
        "model": "qwen/qwen3-235b-a22b",
        "messages": api_messages,
        "max_tokens": 1024,
        "temperature": 0.7,
    }).encode('utf-8')

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        return {'statusCode': 502, 'headers': cors, 'body': json.dumps({'error': f'AI error: {e.code}', 'detail': error_body})}
    except Exception as e:
        return {'statusCode': 502, 'headers': cors, 'body': json.dumps({'error': str(e)})}

    reply = data.get('choices', [{}])[0].get('message', {}).get('content', 'Не удалось получить ответ.')

    if reply.startswith('<think>'):
        think_end = reply.find('</think>')
        if think_end != -1:
            reply = reply[think_end + len('</think>'):].strip()

    return {
        'statusCode': 200,
        'headers': cors,
        'body': json.dumps({'reply': reply}),
    }