export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  provider: 'google' | 'yandex';
}

const SESSION_KEY = 'jurbot_user';

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function startGoogleOAuth(clientId: string) {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem('oauth_verifier', verifier);
  sessionStorage.setItem('oauth_provider', 'google');

  const redirectUri = window.location.origin + '/profile';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function startYandexOAuth(clientId: string) {
  sessionStorage.setItem('oauth_provider', 'yandex');
  const redirectUri = window.location.origin + '/profile';
  const params = new URLSearchParams({
    response_type: 'token',
    client_id: clientId,
    redirect_uri: redirectUri,
  });
  window.location.href = `https://oauth.yandex.ru/authorize?${params}`;
}

export async function handleYandexCallback(accessToken: string): Promise<UserProfile | null> {
  try {
    const resp = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const avatar = data.default_avatar_id
      ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`
      : '';
    return {
      id: String(data.id),
      name: data.real_name || data.display_name || '',
      email: data.default_email || '',
      avatar_url: avatar,
      provider: 'yandex',
    };
  } catch {
    return null;
  }
}
