import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";
import { getStoredUser } from "@/lib/auth";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  time: string;
  files?: { name: string; size: string }[];
  paymentAmount?: number;
  paymentDescription?: string;
  showConfirmPayment?: boolean;
}

const now = () =>
  new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const AI_CHAT_URL = (func2url as Record<string, string>)["ai-chat"] || "";
const PAYMENT_URL = (func2url as Record<string, string>)["create-payment"] || "";

const PRICE_REGEX = /(\d[\d\s]*)\s*₽/;

const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1] || "";
        resolve(`[base64:${file.name}]${base64}`);
      };
      reader.readAsDataURL(file);
    }
  });
};

const Chat = () => {
  const [searchParams] = useSearchParams();
  const selectedService = searchParams.get("service");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      text: selectedService
        ? `Вы выбрали услугу: "${selectedService}". Пожалуйста, загрузите документы для анализа или опишите вашу задачу.`
        : "Здравствуйте! Я ваш финансово-юридический помощник. Выберите услугу из каталога или опишите вашу задачу, и я помогу подобрать оптимальное решение.",
      time: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const userText = input.trim();
    const filesInfo = attachedFiles.map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(0) + " КБ",
    }));

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
      time: now(),
      files: filesInfo.length > 0 ? filesInfo : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Read file contents before clearing attached files
    const fileContents = await Promise.all(
      attachedFiles.map(async (f) => ({
        name: f.name,
        content: await readFileContent(f),
      }))
    );

    setAttachedFiles([]);
    setIsTyping(true);

    const chatHistory = messages
      .filter((m) => m.id !== "1")
      .map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text,
      }));

    chatHistory.push({
      role: "user",
      content: userText || "Анализируй прикреплённые файлы",
    });

    try {
      const resp = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          service: selectedService || "",
          files: fileContents.length > 0 ? fileContents : undefined,
          paid: isPaid,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "Ошибка сервера");
      }

      const reply = data.reply;
      const priceMatch = reply.match(PRICE_REGEX);
      let paymentAmount: number | undefined;
      let paymentDescription: string | undefined;

      if (priceMatch) {
        paymentAmount = parseInt(priceMatch[1].replace(/\s/g, ""), 10);
        paymentDescription = selectedService || "Юридическая услуга";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: reply,
          time: now(),
          paymentAmount,
          paymentDescription,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: "Извините, произошла ошибка при обращении к AI. Попробуйте ещё раз.",
          time: now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePayment = async (amount: number, description: string) => {
    setIsPaying(true);
    try {
      // Create order first
      const orderResp = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          phone: getStoredUser()?.phone || "anonymous",
          service_name: description,
          amount,
        }),
      });
      const orderData = await orderResp.json();
      if (orderResp.ok && orderData.order_id) {
        setCurrentOrderId(orderData.order_id);
      }

      // Create payment URL
      const resp = await fetch(PAYMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          description,
          return_url: window.location.href,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Ошибка создания платежа");

      if (data.payment_url) {
        window.open(data.payment_url, "_blank");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "bot",
            text: `Открыта страница оплаты.\n\nСумма: ${amount.toLocaleString("ru-RU")} ₽\nДоступны: банковская карта, СБП\n\nПосле оплаты нажмите кнопку «Я оплатил(а)» ниже.`,
            time: now(),
            showConfirmPayment: true,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          text: "Не удалось создать платёж. Попробуйте позже.",
          time: now(),
        },
      ]);
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (currentOrderId) {
      try {
        await fetch(AI_CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm_payment", order_id: currentOrderId }),
        });
      } catch {
        // silently ignore confirmation errors
      }
    }
    setIsPaid(true);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "bot",
        text: "Оплата подтверждена! Теперь я проведу полный анализ ваших документов. Отправьте файлы или задайте вопрос.",
        time: now(),
      },
    ]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const getPreferredFormat = (): string => {
    try {
      const raw = localStorage.getItem("jurbot_settings");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.exportFormat) return s.exportFormat;
      }
    } catch { /* ignore */ }
    return "txt";
  };

  const handleExport = (format: string) => {
    const chatMessages = messages.filter((m) => m.id !== "1");
    if (chatMessages.length === 0) return;

    let content: string;
    if (format === "json") {
      content = JSON.stringify(
        chatMessages.map((m) => ({ role: m.role, text: m.text, time: m.time })),
        null,
        2
      );
    } else if (format === "md") {
      content = chatMessages
        .map((m) => `### ${m.role === "bot" ? "ЮрБот" : "Вы"} (${m.time})\n\n${m.text}`)
        .join("\n\n---\n\n");
    } else {
      content = chatMessages
        .map((m) => `[${m.time}] ${m.role === "bot" ? "ЮрБот" : "Вы"}:\n${m.text}`)
        .join("\n\n");
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jurbot-chat.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Чат-бот</h1>
          {selectedService && (
            <p className="text-xs text-primary">Услуга: {selectedService}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport(getPreferredFormat())}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1"
          >
            <Icon name="Download" size={12} />
            Скачать .{getPreferredFormat()}
          </button>
          {["txt", "md", "json"]
            .filter((f) => f !== getPreferredFormat())
            .map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1"
              >
                .{fmt}
              </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {msg.files && msg.files.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.files.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-2 text-xs opacity-80"
                    >
                      <Icon name="Paperclip" size={12} />
                      {f.name} ({f.size})
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <span className="text-[10px] opacity-50 mt-1 block">{msg.time}</span>

              {msg.paymentAmount && msg.paymentDescription && (
                <button
                  onClick={() => handlePayment(msg.paymentAmount!, msg.paymentDescription!)}
                  disabled={isPaying}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Icon name="CreditCard" size={16} />
                  {isPaying ? "Создаю платёж..." : `Оплатить ${msg.paymentAmount.toLocaleString("ru-RU")} ₽`}
                </button>
              )}

              {msg.showConfirmPayment && !isPaid && (
                <button
                  onClick={handleConfirmPayment}
                  className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-xs hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <Icon name="CheckCircle" size={14} />
                  Я оплатил(а)
                </button>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachedFiles.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2 px-1">
          {attachedFiles.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-lg"
            >
              <Icon name="File" size={12} />
              {f.name}
              <button
                onClick={() =>
                  setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="ml-1 hover:text-destructive"
              >
                <Icon name="X" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.jpg,.png,.rtf"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <Icon name="Paperclip" size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Введите сообщение..."
          className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={handleSend}
          disabled={isTyping}
          className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Icon name="Send" size={18} />
        </button>
      </div>
    </div>
  );
};

export default Chat;