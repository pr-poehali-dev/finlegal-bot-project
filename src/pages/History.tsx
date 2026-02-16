import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";

const historyItems = [
  {
    id: "1",
    service: "Анализ договора аренды",
    status: "completed",
    date: "15.02.2026",
    price: "5 000 ₽",
  },
  {
    id: "2",
    service: "Консультация по трудовому праву",
    status: "completed",
    date: "12.02.2026",
    price: "3 000 ₽",
  },
  {
    id: "3",
    service: "Подготовка договора поставки",
    status: "in_progress",
    date: "16.02.2026",
    price: "8 000 ₽",
  },
];

const statusLabels: Record<string, { text: string; color: string }> = {
  completed: { text: "Выполнено", color: "text-green-400 bg-green-400/10" },
  in_progress: { text: "В работе", color: "text-yellow-400 bg-yellow-400/10" },
  pending: { text: "Ожидает оплаты", color: "text-orange-400 bg-orange-400/10" },
};

const History = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">История заказов</h1>
        <p className="text-muted-foreground text-sm">
          Все ваши обращения и результаты работы
        </p>
      </div>

      {historyItems.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">История пуста</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => {
            const status = statusLabels[item.status];
            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground mb-1">{item.service}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Icon name="Calendar" size={12} />
                        {item.date}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-accent">{item.price}</span>
                    {item.status === "completed" && (
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1">
                        <Icon name="Download" size={12} />
                        Скачать
                      </button>
                    )}
                    <Link
                      to="/chat"
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Открыть чат
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
