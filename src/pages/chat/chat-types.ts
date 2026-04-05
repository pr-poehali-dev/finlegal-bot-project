export interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  time: string;
  files?: { name: string; size: string }[];
  paymentAmount?: number;
  paymentDescription?: string;
  showConfirmPayment?: boolean;
}

export interface SavedSession {
  messages: Message[];
  service: string;
  orderId: number | null;
  isPaid: boolean;
  fileContents: FileContent[];
  pendingPayment: boolean;
  timestamp: number;
}

export interface FileContent {
  name: string;
  content: string;
  encoding?: string;
}

export const SESSION_KEY = "jurbot_chat_session";
export const SESSION_TTL = 3600000;

export const now = () =>
  new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const PRICE_REGEX = /(?:^|[^\d])(\d[\d\s.,]*)[\s]*₽/;

const MAX_FILE_SIZE = 3 * 1024 * 1024;

const TEXT_EXTS = [".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm", ".css", ".js", ".ts", ".py", ".sql", ".log", ".ini", ".cfg", ".yaml", ".yml", ".toml", ".env", ".rtf"];
const DOC_EXTS = [".pdf", ".docx", ".doc"];
const SUPPORTED_EXTS = [...TEXT_EXTS, ...DOC_EXTS];

const isTextFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return file.type.startsWith("text/") || TEXT_EXTS.some((ext) => name.endsWith(ext));
};

const isDocFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return DOC_EXTS.some((ext) => name.endsWith(ext));
};

export const readFileContent = (file: File): Promise<FileContent> => {
  return new Promise((resolve) => {
    if (file.size > MAX_FILE_SIZE) {
      resolve({ name: file.name, content: `[Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)} МБ, максимум 3 МБ]` });
      return;
    }
    const name = file.name.toLowerCase();
    const supported = SUPPORTED_EXTS.some((ext) => name.endsWith(ext)) || file.type.startsWith("text/");
    if (!supported) {
      resolve({ name: file.name, content: `[Формат не поддерживается (${file.type || "unknown"}). Поддерживаются: ${SUPPORTED_EXTS.join(", ")}]` });
      return;
    }
    if (isDocFile(file)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1] || "";
        resolve({ name: file.name, content: base64, encoding: "base64" });
      };
      reader.onerror = () => resolve({ name: file.name, content: `[Не удалось прочитать файл]` });
      reader.readAsDataURL(file);
    } else if (isTextFile(file)) {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, content: reader.result as string });
      reader.onerror = () => resolve({ name: file.name, content: `[Не удалось прочитать файл]` });
      reader.readAsText(file);
    } else {
      resolve({ name: file.name, content: `[Формат не поддерживается]` });
    }
  });
};

export const saveSession = (data: Partial<SavedSession> & { messages: Message[] }) => {
  try {
    const existing = loadSession();
    const session: SavedSession = {
      messages: data.messages,
      service: data.service ?? existing?.service ?? "",
      orderId: data.orderId ?? existing?.orderId ?? null,
      isPaid: data.isPaid ?? existing?.isPaid ?? false,
      fileContents: data.fileContents ?? existing?.fileContents ?? [],
      pendingPayment: data.pendingPayment ?? existing?.pendingPayment ?? false,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* quota exceeded */ }
};

export const loadSession = (): SavedSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: SavedSession = JSON.parse(raw);
    if (Date.now() - session.timestamp > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};
