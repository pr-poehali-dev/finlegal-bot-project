import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "@/components/ui/icon";

const navItems = [
  { path: "/", label: "Главная", icon: "Home" },
  { path: "/services", label: "Услуги", icon: "Briefcase" },
  { path: "/pricing", label: "Расценки", icon: "Receipt" },
  { path: "/chat", label: "Чат-бот", icon: "MessageSquare" },
  { path: "/history", label: "История", icon: "Clock" },
  { path: "/profile", label: "Профиль", icon: "User" },
  { path: "/settings", label: "Настройки", icon: "Settings" },
  { path: "/support", label: "Поддержка", icon: "HelpCircle" },
];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon name="Scale" size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">ЮрБот</h1>
              <p className="text-xs text-muted-foreground">Финансы и право</p>
            </div>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            &copy; 2026 ЮрБот. Все права защищены.
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 border-b border-border flex items-center px-4 lg:px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <Icon name="Menu" size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/chat"
              className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Начать консультацию
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
