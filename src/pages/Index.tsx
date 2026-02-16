import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const features = [
  {
    icon: "FileSearch",
    title: "Анализ договоров",
    desc: "Полная проверка юридических документов на риски и соответствие законодательству",
    price: "от 3 000 ₽",
  },
  {
    icon: "BookOpen",
    title: "Консультации по законодательству",
    desc: "Разъяснение правовых норм и рекомендации по вашей ситуации",
    price: "от 1 000 ₽",
  },
  {
    icon: "FilePen",
    title: "Подготовка документов",
    desc: "Составление юридических документов любой сложности под ключ",
    price: "от 5 000 ₽",
  },
];

const stats = [
  { value: "10 000+", label: "Обработано документов" },
  { value: "98%", label: "Точность анализа" },
  { value: "24/7", label: "Доступность бота" },
  { value: "15 мин", label: "Среднее время ответа" },
];

const Index = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="text-center py-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
          <Icon name="Sparkles" size={14} />
          Чат-бот на основе Qwen AI
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
          Финансово-юридический
          <br />
          <span className="text-primary">помощник нового поколения</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
          Анализ документов, юридические консультации и подготовка документов
          с использованием искусственного интеллекта. От 1 000 до 50 000 ₽.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/chat"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Icon name="MessageSquare" size={18} />
            Начать консультацию
          </Link>
          <Link
            to="/pricing"
            className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-secondary/80 transition-colors inline-flex items-center gap-2"
          >
            <Icon name="Receipt" size={18} />
            Посмотреть расценки
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-5 text-center"
          >
            <div className="text-2xl font-bold text-primary mb-1">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Наши услуги</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon name={f.icon} size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{f.desc}</p>
              <div className="text-sm font-medium text-accent">{f.price}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Как это работает?
        </h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
          Простой процесс от выбора услуги до получения результата
        </p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "01", icon: "ListChecks", text: "Выберите услугу" },
            { step: "02", icon: "Upload", text: "Загрузите документы" },
            { step: "03", icon: "CreditCard", text: "Оплатите через ЮKassa" },
            { step: "04", icon: "Download", text: "Получите результат" },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-3">
              <div className="text-xs font-bold text-primary/60">{item.step}</div>
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <Icon name={item.icon} size={20} className="text-foreground" />
              </div>
              <span className="text-sm text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
