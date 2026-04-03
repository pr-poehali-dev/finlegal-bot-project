import { Link } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { getStoredUser } from "@/lib/auth";

const statusLabels: Record<string, { text: string; color: string }> = {
  completed: { text: "Выполнено", color: "text-green-400 bg-green-400/10" },
  in_progress: { text: "В работе", color: "text-yellow-400 bg-yellow-400/10" },
  pending: { text: "Ожидает оплаты", color: "text-orange-400 bg-orange-400/10" },
};

const History = () => {
  const user = getStoredUser();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">История заказов</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Все ваши обращения и результаты работы
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Icon name="LogIn" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Войдите, чтобы увидеть историю</p>
          <p className="text-muted-foreground text-sm mb-4">
            История заказов доступна только авторизованным пользователям
          </p>
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="UserCircle" size={16} />
            Войти в аккаунт
          </Link>
        </div>
      </div>
    );
  }

  const historyItems: {
    id: string;
    service: string;
    status: string;
    date: string;
    price: string;
  }[] = [];

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
          <p className="text-foreground font-medium mb-2">История пока пуста</p>
          <p className="text-muted-foreground text-sm mb-4">
            Ваши заказы будут отображаться здесь после первого обращения
          </p>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="ArrowRight" size={16} />
            Выбрать услугу
          </Link>
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
