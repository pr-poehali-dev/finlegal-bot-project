import Icon from "@/components/ui/icon";
import { getSavedCredentials } from "@/lib/auth";

interface AuthFormProps {
  mode: "login" | "register";
  phone: string;
  name: string;
  password: string;
  confirmPassword: string;
  rememberMe: boolean;
  agreedToTerms: boolean;
  showPassword: boolean;
  loading: boolean;
  error: string;
  hasSavedCreds: boolean;
  formatPhone: (value: string) => string;
  onPhoneChange: (value: string) => void;
  onSetName: (v: string) => void;
  onSetPassword: (v: string) => void;
  onSetConfirmPassword: (v: string) => void;
  onSetRememberMe: (v: boolean) => void;
  onSetAgreedToTerms: (v: boolean) => void;
  onSetShowPassword: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onQuickLogin: () => void;
  onSwitchMode: () => void;
  onShowPrivacy: () => void;
}

const AuthForm = ({
  mode,
  phone,
  name,
  password,
  confirmPassword,
  rememberMe,
  agreedToTerms,
  showPassword,
  loading,
  error,
  hasSavedCreds,
  formatPhone,
  onPhoneChange,
  onSetName,
  onSetPassword,
  onSetConfirmPassword,
  onSetRememberMe,
  onSetAgreedToTerms,
  onSetShowPassword,
  onSubmit,
  onQuickLogin,
  onSwitchMode,
  onShowPrivacy,
}: AuthFormProps) => {
  return (
    <div className="max-w-md mx-auto mt-12 animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Icon name="UserCircle" size={32} className="text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2 text-center">
          {mode === "login" ? "Вход в аккаунт" : "Регистрация"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          {mode === "login"
            ? "Введите номер телефона и пароль"
            : "Создайте аккаунт для доступа к услугам"}
        </p>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {mode === "login" && hasSavedCreds && (
          <button
            onClick={onQuickLogin}
            disabled={loading}
            className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 text-foreground text-sm hover:bg-primary/20 transition-colors disabled:opacity-40"
          >
            <Icon name="Zap" size={18} className="text-primary" />
            <span>Быстрый вход</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatPhone(getSavedCredentials()?.phone || "")}
            </span>
          </button>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Ваше имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => onSetName(e.target.value)}
                placeholder="Иван Петров"
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Номер телефона</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => onSetPassword(e.target.value)}
                placeholder={mode === "register" ? "Минимум 6 символов" : "Ваш пароль"}
                className="w-full px-4 py-3 pr-12 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => onSetShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name={showPassword ? "EyeOff" : "Eye"} size={18} />
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Повторите пароль</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => onSetConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {mode === "login" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => onSetRememberMe(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-xs text-muted-foreground">Запомнить меня</span>
            </label>
          )}

          {mode === "register" && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => onSetRememberMe(e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-xs text-muted-foreground">Запомнить данные для входа</span>
              </label>

              <label className="flex items-start gap-2 text-left cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => onSetAgreedToTerms(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Я даю{" "}
                  <button
                    type="button"
                    onClick={onShowPrivacy}
                    className="text-primary underline"
                  >
                    согласие на обработку персональных данных
                  </button>{" "}
                  и принимаю{" "}
                  <button
                    type="button"
                    onClick={onShowPrivacy}
                    className="text-primary underline"
                  >
                    политику конфиденциальности
                  </button>
                </span>
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "register" && !agreedToTerms)}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Загрузка...
              </span>
            ) : mode === "login" ? (
              "Войти"
            ) : (
              "Создать аккаунт"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchMode}
            className="text-sm text-primary hover:underline"
          >
            {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
