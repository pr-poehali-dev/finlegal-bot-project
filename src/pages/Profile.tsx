import { useState } from "react";
import Icon from "@/components/ui/icon";

const Profile = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (!isLoggedIn) {
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

          <div className="space-y-3 mb-6">
            {[
              { name: "Google", icon: "Chrome", color: "hover:border-red-500/40" },
              { name: "ВКонтакте", icon: "MessageCircle", color: "hover:border-blue-500/40" },
              { name: "Telegram", icon: "Send", color: "hover:border-sky-500/40" },
              { name: "Яндекс", icon: "Search", color: "hover:border-yellow-500/40" },
            ].map((provider) => (
              <button
                key={provider.name}
                onClick={() => agreedToTerms && setIsLoggedIn(true)}
                disabled={!agreedToTerms}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-secondary text-secondary-foreground text-sm transition-colors ${
                  agreedToTerms
                    ? `${provider.color} hover:bg-secondary/80 cursor-pointer`
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                <Icon name={provider.icon} size={18} />
                Войти через {provider.name}
              </button>
            ))}
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
                  производится через защищённый сервис ЮKassa. Мы не храним данные
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
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon name="User" size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Пользователь</h1>
            <p className="text-sm text-muted-foreground">user@example.com</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">3</div>
            <div className="text-xs text-muted-foreground">Заказа</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent">16 000 ₽</div>
            <div className="text-xs text-muted-foreground">Потрачено</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">2</div>
            <div className="text-xs text-muted-foreground">Выполнено</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsLoggedIn(false)}
        className="w-full bg-secondary text-secondary-foreground py-3 rounded-lg text-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
      >
        Выйти из аккаунта
      </button>
    </div>
  );
};

export default Profile;
