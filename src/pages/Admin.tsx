import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";

const API_URL = (func2url as Record<string, string>)["ai-chat"] || "";

interface Ticket {
  id: number;
  phone: string;
  name: string;
  message: string;
  status: string;
  created_at: string;
}

interface Order {
  id: number;
  phone: string;
  service: string;
  amount: number;
  status: string;
  label: string;
  created_at: string;
  paid_at: string | null;
}

const statusLabels: Record<string, string> = {
  new: "Новое",
  in_progress: "В работе",
  resolved: "Решено",
  closed: "Закрыто",
  pending: "Ожидает",
  paid: "Оплачен",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-green-500/20 text-green-400",
  closed: "bg-gray-500/20 text-gray-400",
  pending: "bg-orange-500/20 text-orange-400",
  paid: "bg-green-500/20 text-green-400",
};

const Admin = () => {
  const [tab, setTab] = useState<"tickets" | "orders">("tickets");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_tickets" }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setTickets(data.items || []);
        setTicketsTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_orders" }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setOrders(data.items || []);
        setOrdersTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    loadOrders();
  }, []);

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_ticket", ticket_id: ticketId, status }),
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
      );
    } catch { /* ignore */ }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Админ-панель</h1>
          <p className="text-muted-foreground text-sm">Обращения и заказы</p>
        </div>
        <button
          onClick={() => { loadTickets(); loadOrders(); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <Icon name="RefreshCw" size={14} className={loading ? "animate-spin" : ""} />
          Обновить
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setTab("tickets")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "tickets"
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="MessageSquare" size={16} />
          Обращения
          <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
            {ticketsTotal}
          </span>
        </button>
        <button
          onClick={() => setTab("orders")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "orders"
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="ShoppingCart" size={16} />
          Заказы
          <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
            {ordersTotal}
          </span>
        </button>
      </div>

      {tab === "tickets" && (
        <div className="space-y-3">
          {tickets.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Обращений пока нет
            </div>
          )}
          {tickets.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">#{t.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[t.status] || "bg-secondary text-muted-foreground"}`}>
                      {statusLabels[t.status] || t.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{t.message}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  {t.name && (
                    <span className="flex items-center gap-1">
                      <Icon name="User" size={12} />
                      {t.name}
                    </span>
                  )}
                  {t.phone && (
                    <span className="flex items-center gap-1">
                      <Icon name="Phone" size={12} />
                      {t.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Icon name="Clock" size={12} />
                    {formatDate(t.created_at)}
                  </span>
                </div>
                <select
                  value={t.status}
                  onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                >
                  <option value="new">Новое</option>
                  <option value="in_progress">В работе</option>
                  <option value="resolved">Решено</option>
                  <option value="closed">Закрыто</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Заказов пока нет
            </div>
          )}
          {orders.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{o.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[o.status] || "bg-secondary text-muted-foreground"}`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {o.amount.toLocaleString("ru-RU")} ₽
                </span>
              </div>
              <p className="text-sm text-foreground mb-2">{o.service}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {o.phone && (
                  <span className="flex items-center gap-1">
                    <Icon name="Phone" size={12} />
                    {o.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Icon name="Clock" size={12} />
                  {formatDate(o.created_at)}
                </span>
                {o.paid_at && (
                  <span className="flex items-center gap-1 text-green-400">
                    <Icon name="CheckCircle" size={12} />
                    Оплачен {formatDate(o.paid_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Загрузка...
        </div>
      )}
    </div>
  );
};

export default Admin;