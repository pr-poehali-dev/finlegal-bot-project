import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import func2url from "../../backend/func2url.json";

const API_URL = (func2url as Record<string, string>)["ai-chat"] || "";
const ADMIN_KEY = "jurbot_admin_pwd";

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
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<"tickets" | "orders">("tickets");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const getPassword = () => sessionStorage.getItem(ADMIN_KEY) || "";

  const handleLogin = async () => {
    if (!password.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_auth", admin_password: password }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        setAuthError(data.error || "Неверный пароль");
        return;
      }
      sessionStorage.setItem(ADMIN_KEY, password);
      setAuthed(true);
    } catch {
      setAuthError("Ошибка соединения");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_KEY);
    setAuthed(false);
    setPassword("");
    setTickets([]);
    setOrders([]);
  };

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_tickets", admin_password: getPassword() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setTickets(data.items || []);
        setTicketsTotal(data.total || 0);
      } else if (resp.status === 403) {
        handleLogout();
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_orders", admin_password: getPassword() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setOrders(data.items || []);
        setOrdersTotal(data.total || 0);
      } else if (resp.status === 403) {
        handleLogout();
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY);
    if (saved) {
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_auth", admin_password: saved }),
      }).then((resp) => {
        if (resp.ok) {
          setAuthed(true);
        } else {
          sessionStorage.removeItem(ADMIN_KEY);
        }
      }).catch(() => { /* ignore */ });
    }
  }, []);

  useEffect(() => {
    if (authed) {
      loadTickets();
      loadOrders();
    }
  }, [authed, loadTickets, loadOrders]);

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_ticket", ticket_id: ticketId, status, admin_password: getPassword() }),
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

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20 animate-fade-in">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <Icon name="Shield" size={24} className="text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Админ-панель</h1>
            <p className="text-sm text-muted-foreground mt-1">Введите пароль для доступа</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Пароль"
            className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {authError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <Icon name="AlertCircle" size={14} />
              {authError}
            </div>
          )}
          <button
            onClick={handleLogin}
            disabled={authLoading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {authLoading ? "Проверка..." : "Войти"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Админ-панель</h1>
          <p className="text-muted-foreground text-sm">Обращения и заказы</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadTickets(); loadOrders(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            <Icon name="RefreshCw" size={14} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-red-400 rounded-lg text-sm hover:bg-secondary/80 transition-colors"
          >
            <Icon name="LogOut" size={14} />
            Выйти
          </button>
        </div>
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
