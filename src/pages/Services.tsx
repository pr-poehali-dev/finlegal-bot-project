import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const categories = [
  {
    id: "contracts",
    title: "Анализ договоров",
    icon: "FileSearch",
    services: [
      { name: "Экспресс-проверка договора", complexity: "Простой", volume: "до 10 стр.", time: "30 мин", price: 1000 },
      { name: "Полный анализ договора", complexity: "Средний", volume: "до 30 стр.", time: "2 часа", price: 3000 },
      { name: "Анализ сложного контракта", complexity: "Сложный", volume: "до 100 стр.", time: "1 день", price: 8000 },
      { name: "Комплексная экспертиза пакета", complexity: "Экспертный", volume: "без ограничений", time: "3 дня", price: 20000 },
    ],
  },
  {
    id: "consulting",
    title: "Консультации по законодательству",
    icon: "BookOpen",
    services: [
      { name: "Устная консультация", complexity: "Простой", volume: "1 вопрос", time: "15 мин", price: 1000 },
      { name: "Письменное заключение", complexity: "Средний", volume: "до 5 вопросов", time: "1 час", price: 3000 },
      { name: "Правовой анализ ситуации", complexity: "Сложный", volume: "комплексный", time: "1 день", price: 10000 },
      { name: "Стратегическое консультирование", complexity: "Экспертный", volume: "без ограничений", time: "5 дней", price: 30000 },
    ],
  },
  {
    id: "documents",
    title: "Подготовка документов",
    icon: "FilePen",
    services: [
      { name: "Типовой документ", complexity: "Простой", volume: "1 документ", time: "1 час", price: 2000 },
      { name: "Нестандартный документ", complexity: "Средний", volume: "1-3 документа", time: "4 часа", price: 5000 },
      { name: "Пакет юридических документов", complexity: "Сложный", volume: "до 10 документов", time: "2 дня", price: 15000 },
      { name: "Полный комплект под проект", complexity: "Экспертный", volume: "без ограничений", time: "7 дней", price: 50000 },
    ],
  },
];

const complexityColors: Record<string, string> = {
  "Простой": "text-green-400 bg-green-400/10",
  "Средний": "text-yellow-400 bg-yellow-400/10",
  "Сложный": "text-orange-400 bg-orange-400/10",
  "Экспертный": "text-red-400 bg-red-400/10",
};

const Services = () => {
  const [activeCategory, setActiveCategory] = useState("contracts");

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Каталог услуг</h1>
        <p className="text-muted-foreground text-sm">
          Выберите нужную услугу и перейдите к консультации с ботом
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Icon name={cat.icon} size={16} />
            {cat.title}
          </button>
        ))}
      </div>

      {categories
        .filter((cat) => cat.id === activeCategory)
        .map((cat) => (
          <div key={cat.id} className="space-y-3">
            {cat.services.map((service) => (
              <div
                key={service.name}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">
                      {service.name}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${complexityColors[service.complexity]}`}>
                        {service.complexity}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Icon name="FileText" size={12} />
                        {service.volume}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Icon name="Clock" size={12} />
                        {service.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent">
                        {service.price.toLocaleString("ru-RU")} ₽
                      </div>
                    </div>
                    <Link
                      to={`/chat?service=${encodeURIComponent(service.name)}`}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      Выбрать
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
};

export default Services;
