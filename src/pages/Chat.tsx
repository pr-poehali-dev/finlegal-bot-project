import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import func2url from "../../backend/func2url.json";
import { getStoredUser } from "@/lib/auth";
import {
  type Message,
  type FileContent,
  now,
  PRICE_REGEX,
  readFileContent,
  saveSession,
  loadSession,
  clearSession,
} from "./chat/chat-types";
import ChatHeader from "./chat/ChatHeader";
import ChatMessages from "./chat/ChatMessages";
import ChatInput from "./chat/ChatInput";

const AI_CHAT_URL = (func2url as Record<string, string>)["ai-chat"] || "";
const PAYMENT_URL = (func2url as Record<string, string>)["create-payment"] || "";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const selectedService = searchParams.get("service");

  const saved = loadSession();
  const isReturningFromPayment = saved?.pendingPayment && saved?.fileContents?.length > 0;

  const [messages, setMessages] = useState<Message[]>(() => {
    if (saved && saved.messages.length > 1) {
      return saved.messages;
    }
    return [
      {
        id: "1",
        role: "bot",
        text: selectedService
          ? `Вы выбрали услугу: «${selectedService}». Загрузите документы или опишите задачу — я приступлю к работе.`
          : "Здравствуйте! Я ЮрБот — ваш финансово-юридический помощник. Выберите услугу из каталога или опишите задачу, и я помогу.",
        time: now(),
      },
    ];
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(saved?.isPaid ?? false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(saved?.orderId ?? null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [lastFileContents, setLastFileContents] = useState<FileContent[]>(saved?.fileContents ?? []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const returnHandledRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    saveSession({
      messages,
      service: selectedService || "",
      orderId: currentOrderId,
      isPaid,
      fileContents: lastFileContents,
      pendingPayment: false,
    });
  }, [messages, currentOrderId, isPaid, lastFileContents, selectedService]);

  const autoDownloadResult = useCallback((text: string, service: string) => {
    const filename = `ЮрБот_${(service || "анализ").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const runPaidAnalysis = useCallback(async (files: FileContent[], service: string, orderId: number | null) => {
    if (orderId) {
      try {
        await fetch(AI_CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm_payment", order_id: orderId }),
        });
      } catch { /* ignore */ }
    }

    setIsTyping(true);
    try {
      const resp = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          messages: [{ role: "user", content: "Выполни полный анализ загруженных документов" }],
          service: service,
          files: files.length > 0 ? files : undefined,
          paid: true,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Ошибка сервера");

      const reply = data.reply;

      if (orderId) {
        try {
          await fetch(AI_CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_result", order_id: orderId, result: reply }),
          });
        } catch { /* ignore */ }
      }

      autoDownloadResult(reply, service);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: reply + "\n\n✅ Результат сохранён в файл.",
          time: now(),
        },
      ]);

      setIsPaid(true);
    } catch (e) {
      const errorText = e instanceof Error ? e.message : "Неизвестная ошибка";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: `Ошибка при анализе: ${errorText}. Попробуйте отправить файлы ещё раз.`,
          time: now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [autoDownloadResult]);

  useEffect(() => {
    if (isReturningFromPayment && !returnHandledRef.current) {
      returnHandledRef.current = true;
      const service = saved!.service || selectedService || "";
      const files = saved!.fileContents;
      const orderId = saved!.orderId;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          text: "Оплата подтверждена! Выполняю полный анализ ваших документов...",
          time: now(),
        },
      ]);

      runPaidAnalysis(files, service, orderId);
    }
  }, [isReturningFromPayment, saved, selectedService, runPaidAnalysis]);

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

    const fileContents = await Promise.all(attachedFiles.map((f) => readFileContent(f)));
    if (fileContents.length > 0) {
      setLastFileContents(fileContents);
    }

    setAttachedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          action: "chat",
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

      if (priceMatch && !isPaid) {
        const cleaned = priceMatch[1].replace(/[\s.,]/g, "");
        const parsed = parseInt(cleaned, 10);
        if (!isNaN(parsed) && parsed >= 100 && parsed <= 10_000_000) {
          paymentAmount = parsed;
          paymentDescription = selectedService || "Юридическая услуга";
        }
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
    } catch (e) {
      const errorText = e instanceof Error ? e.message : "Неизвестная ошибка";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: errorText,
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
      const orderResp = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          phone: getStoredUser()?.phone || "anonymous",
          service_name: description,
          amount,
          files_data: lastFileContents.length > 0 ? JSON.stringify(lastFileContents) : undefined,
        }),
      });
      const orderData = await orderResp.json();
      if (!orderResp.ok || !orderData.order_id) {
        throw new Error(orderData.error || "Не удалось создать заказ");
      }
      setCurrentOrderId(orderData.order_id);

      saveSession({
        messages: [...messages],
        service: selectedService || "",
        orderId: orderData.order_id,
        isPaid: false,
        fileContents: lastFileContents,
        pendingPayment: true,
      });

      const resp = await fetch(PAYMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          description,
          label: orderData.payment_label,
          return_url: window.location.href,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Ошибка создания платежа");

      if (data.payment_url) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "bot",
            text: `Переходим к оплате.\n\nСумма: ${amount.toLocaleString("ru-RU")} ₽\nДоступны: банковская карта, СБП\n\nПосле оплаты вы будете перенаправлены обратно — анализ начнётся автоматически.\n\nЕсли страница не перезагрузилась — нажмите кнопку «Я оплатил(а)» ниже.`,
            time: now(),
            showConfirmPayment: true,
          },
        ]);

        window.location.href = data.payment_url;
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "bot",
          text: e instanceof Error ? e.message : "Не удалось создать платёж. Попробуйте позже.",
          time: now(),
        },
      ]);
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmPayment = async () => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "bot",
        text: "Оплата подтверждена! Выполняю полный анализ ваших документов...",
        time: now(),
      },
    ]);

    const service = selectedService || saved?.service || "";
    const files = lastFileContents.length > 0 ? lastFileContents : (saved?.fileContents ?? []);
    const orderId = currentOrderId || saved?.orderId || null;

    await runPaidAnalysis(files, service, orderId);
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

  const handleNewChat = () => {
    clearSession();
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      <ChatHeader
        serviceName={selectedService || saved?.service || null}
        messages={messages}
        onNewChat={handleNewChat}
        onExport={handleExport}
        preferredFormat={getPreferredFormat()}
      />

      <ChatMessages
        ref={messagesEndRef}
        messages={messages}
        isTyping={isTyping}
        isPaying={isPaying}
        isPaid={isPaid}
        onPayment={handlePayment}
        onConfirmPayment={handleConfirmPayment}
      />

      <ChatInput
        ref={fileInputRef}
        input={input}
        isTyping={isTyping}
        attachedFiles={attachedFiles}
        onInputChange={setInput}
        onSend={handleSend}
        onFileChange={handleFileChange}
        onRemoveFile={(i) => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
        onAttachClick={() => fileInputRef.current?.click()}
      />
    </div>
  );
};

export default Chat;
