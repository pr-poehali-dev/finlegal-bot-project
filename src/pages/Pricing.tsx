import Icon from "@/components/ui/icon";

const pricingData = [
  {
    category: "Анализ договоров",
    icon: "FileSearch",
    tiers: [
      { level: "Простой", volume: "до 10 страниц", time: "30 мин", range: "1 000 — 2 000 ₽" },
      { level: "Средний", volume: "до 30 страниц", time: "2 часа", range: "3 000 — 5 000 ₽" },
      { level: "Сложный", volume: "до 100 страниц", time: "1 день", range: "5 000 — 15 000 ₽" },
      { level: "Экспертный", volume: "без ограничений", time: "3 дня", range: "15 000 — 50 000 ₽" },
    ],
  },
  {
    category: "Консультации",
    icon: "BookOpen",
    tiers: [
      { level: "Простой", volume: "1 вопрос", time: "15 мин", range: "1 000 — 2 000 ₽" },
      { level: "Средний", volume: "до 5 вопросов", time: "1 час", range: "3 000 — 5 000 ₽" },
      { level: "Сложный", volume: "комплексный анализ", time: "1 день", range: "5 000 — 15 000 ₽" },
      { level: "Экспертный", volume: "стратегия", time: "5 дней", range: "15 000 — 50 000 ₽" },
    ],
  },
  {
    category: "Подготовка документов",
    icon: "FilePen",
    tiers: [
      { level: "Простой", volume: "1 документ", time: "1 час", range: "2 000 — 3 000 ₽" },
      { level: "Средний", volume: "1-3 документа", time: "4 часа", range: "5 000 — 8 000 ₽" },
      { level: "Сложный", volume: "до 10 документов", time: "2 дня", range: "10 000 — 25 000 ₽" },
      { level: "Экспертный", volume: "полный комплект", time: "7 дней", range: "25 000 — 50 000 ₽" },
    ],
  },
];

const levelColors: Record<string, string> = {
  "Простой": "border-green-500/30 bg-green-500/5",
  "Средний": "border-yellow-500/30 bg-yellow-500/5",
  "Сложный": "border-orange-500/30 bg-orange-500/5",
  "Экспертный": "border-red-500/30 bg-red-500/5",
};

const Pricing = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Расценки</h1>
        <p className="text-muted-foreground text-sm">
          Точная стоимость определяется после анализа ваших документов
        </p>
      </div>

      <div className="bg-card border border-primary/20 rounded-xl p-5 flex items-start gap-3">
        <Icon name="Info" size={20} className="text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Как формируется цена?</strong> После выбора услуги
          бот проведёт анализ ваших документов по объёму, сложности и времени выполнения.
          На основе анализа будет рассчитана точная стоимость. Оплата — только после
          вашего подтверждения через ЮKassa.
        </div>
      </div>

      {pricingData.map((section) => (
        <div key={section.category} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Icon name={section.icon} size={20} className="text-primary" />
            {section.category}
          </h2>

          <div className="grid md:grid-cols-2 gap-3">
            {section.tiers.map((tier) => (
              <div
                key={tier.level}
                className={`border rounded-xl p-5 ${levelColors[tier.level]}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-foreground">
                    {tier.level}
                  </span>
                  <span className="text-sm font-bold text-accent">{tier.range}</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Icon name="FileText" size={12} />
                    Объём: {tier.volume}
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="Clock" size={12} />
                    Срок: {tier.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Pricing;
