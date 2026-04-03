import func2url from "../../backend/func2url.json";

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
}

const SESSION_KEY = 'jurbot_user';
const TOKEN_KEY = 'jurbot_token';
const SAVED_PHONE_KEY = 'jurbot_saved_phone';
const SAVED_PASS_KEY = 'jurbot_saved_pass';
const API_URL = (func2url as Record<string, string>)['ai-chat'] || '';

export function getSavedCredentials(): { phone: string; password: string } | null {
  const phone = localStorage.getItem(SAVED_PHONE_KEY);
  const password = localStorage.getItem(SAVED_PASS_KEY);
  if (phone && password) return { phone, password };
  return null;
}

export function saveCredentials(phone: string, password: string) {
  localStorage.setItem(SAVED_PHONE_KEY, phone);
  localStorage.setItem(SAVED_PASS_KEY, password);
}

export function clearCredentials() {
  localStorage.removeItem(SAVED_PHONE_KEY);
  localStorage.removeItem(SAVED_PASS_KEY);
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setSession(user: UserProfile | null, token?: string) {
  if (user && token) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function register(phone: string, name: string, password: string): Promise<{ user: UserProfile; token: string }> {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', phone, name, password }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Ошибка регистрации');
  return data;
}

export async function login(phone: string, password: string): Promise<{ user: UserProfile; token: string }> {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', phone, password }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Ошибка входа');
  return data;
}

export async function fetchMe(): Promise<UserProfile | null> {
  const token = getToken();
  if (!token) return null;
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
    body: JSON.stringify({ action: 'me' }),
  });
  if (!resp.ok) return null;
  return resp.json();
}