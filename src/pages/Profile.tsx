import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";
import {
  getStoredUser,
  setStoredUser,
  startGoogleOAuth,
  UserProfile,
} from "@/lib/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const Profile = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("error")) {
      setError("Ошибка авторизации. Попробуйте ещё раз.");
    }
    const stored = getStoredUser();
    setUser(stored);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setStoredUser(null);
    setUser(null);
  };

  const handleGoogle = async () => {
    await startGoogleOAuth(GOOGLE_CLIENT_ID);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-12 animate-fade-in">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="UserCircle" size={32} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Вход в аккаунт</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Войдите для доступа к истории и персональным настройкам
          </p>

          {error && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={handleGoogle}
              disabled={!agreedToTerms}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm transition-colors ${
                agreedToTerms
                  ? "hover:border-red-500/40 hover:bg-secondary/80 cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Войти через Google
            </button>
          </div>

          <label className="flex items-start gap-2 text-left cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              Я даю{" "}
              <button
                onClick={() => setShowPrivacy(true)}
                className="text-primary underline"
              >
                согласие на обработку персональных данных
              </button>{" "}
              и принимаю{" "}
              <button
                onClick={() => setShowPrivacy(true)}
                className="text-primary underline"
              >
                политику конфиденциальности
              </button>
            </span>
          </label>
        </div>

        {showPrivacy && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Политика конфиденциальности
                </h2>
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>
              <div className="text-sm text-muted-foreground space-y-3">
                <p>
                  Настоящая Политика конфиденциальности определяет порядок обработки
                  и защиты персональных данных пользователей сервиса «ЮрБот».
                </p>
                <p>
                  <strong className="text-foreground">1. Сбор данных.</strong> Мы собираем
                  информацию, которую вы предоставляете при регистрации: имя, email,
                  данные профиля социальной сети.
                </p>
                <p>
                  <strong className="text-foreground">2. Использование данных.</strong> Данные
                  используются для предоставления услуг, обработки платежей и улучшения
                  сервиса.
                </p>
                <p>
                  <strong className="text-foreground">3. Защита данных.</strong> Мы применяем
                  современные методы шифрования и защиты. Данные не передаются третьим
                  лицам без вашего согласия.
                </p>
                <p>
                  <strong className="text-foreground">4. Платёжные данные.</strong> Оплата
                  производится через защищённый сервис YooMoney. Мы не храним данные
                  банковских карт.
                </p>
                <p>
                  <strong className="text-foreground">5. Права пользователя.</strong> Вы можете
                  запросить удаление ваших данных, обратившись в поддержку.
                </p>
              </div>
              <button
                onClick={() => setShowPrivacy(false)}
                className="mt-4 w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon name="User" size={28} className="text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{user.name || "Пользователь"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Вход через Google</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">0</div>
            <div className="text-xs text-muted-foreground">Заказов</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent">0 ₽</div>
            <div className="text-xs text-muted-foreground">Потрачено</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">0</div>
            <div className="text-xs text-muted-foreground">Выполнено</div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-secondary text-secondary-foreground py-3 rounded-lg text-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
      >
        Выйти из аккаунта
      </button>
    </div>
  );
};

export default Profile;
