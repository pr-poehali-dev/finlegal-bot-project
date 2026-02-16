import { useState } from "react";
import Icon from "@/components/ui/icon";

const faq = [
  {
    q: "Как формируется стоимость услуги?",
    a: "Стоимость зависит от объёма документов, сложности задачи и времени выполнения. Бот проводит предварительный анализ и называет точную цену до оплаты.",
  },
  {
    q: "Какие форматы документов поддерживаются?",
    a: "PDF, DOC, DOCX, TXT, XLS, XLSX, RTF, JPG, PNG. Вы можете загрузить несколько файлов одновременно.",
  },
  {
    q: "Как происходит оплата?",
    a: "Оплата проходит через защищённый сервис ЮKassa. Мы принимаем банковские карты, электронные кошельки и другие способы оплаты.",
  },
  {
    q: "Можно ли получить возврат?",
    a: "Да, если работа не была начата или результат не соответствует заявленным требованиям, вы можете запросить возврат через поддержку.",
  },
  {
    q: "В каком формате я получу результат?",
    a: "Результат доступен в форматах TXT, MD, JSON, PDF и DOCX. Вы можете выбрать формат в настройках или скачать в чате.",
  },
];

const Support = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) return;
    setSent(true);
    setMessage("");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Поддержка</h1>
        <p className="text-muted-foreground text-sm">Ответы на частые вопросы и обратная связь</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground mb-3">Частые вопросы</h2>
        {faq.map((item, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <Icon
                name={openIdx === i ? "ChevronUp" : "ChevronDown"}
                size={16}
                className="text-muted-foreground shrink-0 ml-2"
              />
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Написать в поддержку</h2>
        {sent ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Icon name="CheckCircle" size={18} />
            Сообщение отправлено! Мы ответим в ближайшее время.
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите вашу проблему или вопрос..."
              rows={4}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <button
              onClick={handleSubmit}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Отправить
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;
