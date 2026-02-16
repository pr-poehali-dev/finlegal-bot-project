import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  time: string;
  files?: { name: string; size: string }[];
}

const now = () =>
  new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const Chat = () => {
  const [searchParams] = useSearchParams();
  const selectedService = searchParams.get("service");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      text: selectedService
        ? `Вы выбрали услугу: "${selectedService}". Пожалуйста, загрузите документы для анализа, и я определю объём, сложность и точную стоимость работы.`
        : "Здравствуйте! Я ваш финансово-юридический помощник. Выберите услугу из каталога или опишите вашу задачу, и я помогу подобрать оптимальное решение.",
      time: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      time: now(),
      files: attachedFiles.map((f) => ({
        name: f.name,
        size: (f.size / 1024).toFixed(0) + " КБ",
      })),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedFiles([]);
    setIsTyping(true);

    setTimeout(() => {
      const hasFiles = userMsg.files && userMsg.files.length > 0;

      let botText = "";
      if (hasFiles && selectedService) {
        botText = `Документы получены (${userMsg.files!.length} шт.). Провожу анализ...\n\n📊 **Результат анализа:**\n• Объём: ${userMsg.files!.length} документ(ов)\n• Сложность: средняя\n• Ориентировочное время: 2-4 часа\n\n💰 **Стоимость: 5 000 ₽**\n\nДля оплаты через ЮKassa нажмите кнопку ниже. После подтверждения оплаты я сразу приступлю к работе.`;
      } else if (hasFiles) {
        botText = `Получил ваши файлы (${userMsg.files!.length} шт.). Чтобы я мог провести анализ, выберите тип услуги:\n\n1. Анализ договоров\n2. Консультация по законодательству\n3. Подготовка документов\n\nИли опишите задачу своими словами.`;
      } else {
        botText =
          "Понял вашу задачу. Для точного расчёта стоимости мне потребуется проанализировать ваши документы. Пожалуйста, загрузите файлы через кнопку 📎 или выберите конкретную услугу в каталоге.";
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "bot", text: botText, time: now() },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleExport = (format: string) => {
    const lastBotMsg = [...messages].reverse().find((m) => m.role === "bot");
    if (!lastBotMsg) return;

    const content =
      format === "txt"
        ? lastBotMsg.text
        : format === "json"
          ? JSON.stringify({ response: lastBotMsg.text, time: lastBotMsg.time }, null, 2)
          : `# Ответ ЮрБот\n\n${lastBotMsg.text}\n\n---\n_${lastBotMsg.time}_`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jurbot-response.${format}`;
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
          {["txt", "md", "json"].map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1"
            >
              <Icon name="Download" size={12} />
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
          className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Icon name="Send" size={18} />
        </button>
      </div>
    </div>
  );
};

export default Chat;
