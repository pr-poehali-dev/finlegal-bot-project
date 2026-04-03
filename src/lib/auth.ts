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

async function apiCall(body: Record<string, unknown>, extraHeaders?: Record<string, string>) {
  if (!API_URL) throw new Error('Сервер недоступен. Попробуйте позже.');
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    });
    if (resp.status === 402) throw new Error('Сервис временно недоступен. Попробуйте позже.');
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text || 'Неизвестная ошибка сервера' }; }
    if (!resp.ok) throw new Error(data.error || `Ошибка сервера (${resp.status})`);
    return data;
  } catch (err: unknown) {
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
      throw new Error('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.');
    }
    throw err;
  }
}

export async function register(phone: string, name: string, password: string): Promise<{ user: UserProfile; token: string }> {
  return apiCall({ action: 'register', phone, name, password });
}

export async function login(phone: string, password: string): Promise<{ user: UserProfile; token: string }> {
  return apiCall({ action: 'login', phone, password });
}

export async function fetchMe(): Promise<UserProfile | null> {
  const token = getToken();
  if (!token) return null;
  try {
    return await apiCall({ action: 'me' }, { 'X-Session-Id': token });
  } catch {
    return null;
  }
}