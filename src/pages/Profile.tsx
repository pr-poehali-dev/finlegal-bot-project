import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  getStoredUser,
  setSession,
  register,
  login,
  getSavedCredentials,
  saveCredentials,
  clearCredentials,
  updateProfile,
  deleteAccount,
  UserProfile,
} from "@/lib/auth";

const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSavedCreds, setHasSavedCreds] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    const saved = getSavedCredentials();
    if (saved) {
      setPhone(formatPhone(saved.phone));
      setPassword(saved.password);
      setHasSavedCreds(true);
    }
  }, []);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    let formatted = "+7";
    if (digits.length > 1) formatted += " (" + digits.slice(1, 4);
    if (digits.length > 4) formatted += ") " + digits.slice(4, 7);
    if (digits.length > 7) formatted += "-" + digits.slice(7, 9);
    if (digits.length > 9) formatted += "-" + digits.slice(9, 11);
    return formatted;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      setPhone(digits.length === 0 ? "" : formatPhone(value));
    }
  };

  const validateForm = (): string | null => {
    const rawPhone = phone.replace(/\D/g, "");
    if (rawPhone.length !== 11) return "Введите полный номер телефона";
    if (!password) return "Введите пароль";

    if (mode === "register") {
      if (!name.trim()) return "Введите ваше имя";
      if (name.trim().length < 2) return "Имя слишком короткое";
      if (password.length < 6) return "Пароль — минимум 6 символов";
      if (password !== confirmPassword) return "Пароли не совпадают";
      if (!agreedToTerms) return "Примите условия для продолжения";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    const rawPhone = phone.replace(/\D/g, "");

    try {
      let result;
      if (mode === "register") {
        result = await register(rawPhone, name.trim(), password);
      } else {
        result = await login(rawPhone, password);
      }

      if (rememberMe) {
        saveCredentials(rawPhone, password);
      } else {
        clearCredentials();
      }

      setSession(result.user, result.token);
      setUser(result.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    const saved = getSavedCredentials();
    if (!saved) return;
    setError("");
    setLoading(true);
    try {
      const result = await login(saved.phone, saved.password);
      setSession(result.user, result.token);
      setUser(result.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      clearCredentials();
      setHasSavedCreds(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setUser(null);
    setName("");
    setConfirmPassword("");
    const saved = getSavedCredentials();
    if (saved) {
      setPhone(formatPhone(saved.phone));
      setPassword(saved.password);
      setHasSavedCreds(true);
    } else {
      setPhone("");
      setPassword("");
    }
  };

  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirm, setEditConfirm] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStartEdit = () => {
    setEditName(user?.name || "");
    setEditPassword("");
    setEditConfirm("");
    setEditError("");
    setEditSuccess("");
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    setEditError("");
    setEditSuccess("");

    if (editName.trim() && editName.trim().length < 2) {
      setEditError("Имя слишком короткое");
      return;
    }
    if (editPassword && editPassword.length < 6) {
      setEditError("Пароль — минимум 6 символов");
      return;
    }
    if (editPassword && editPassword !== editConfirm) {
      setEditError("Пароли не совпадают");
      return;
    }

    const updates: { name?: string; new_password?: string } = {};
    if (editName.trim() && editName.trim() !== user?.name) updates.name = editName.trim();
    if (editPassword) updates.new_password = editPassword;

    if (!updates.name && !updates.new_password) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const result = await updateProfile(updates);
      setSession(result.user, localStorage.getItem("jurbot_token") || "");
      setUser(result.user);
      if (updates.new_password) {
        const saved = getSavedCredentials();
        if (saved) saveCredentials(saved.phone, updates.new_password);
      }
      setEditSuccess("Сохранено");
      setTimeout(() => { setEditing(false); setEditSuccess(""); }, 1500);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      clearCredentials();
      setSession(null);
      setUser(null);
      setShowDelete(false);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Ошибка удаления");
      setDeleting(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon name="User" size={28} className="text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{user.name}</h1>
              <p className="text-sm text-muted-foreground">
                +7 ({user.phone.slice(1, 4)}) {user.phone.slice(4, 7)}-{user.phone.slice(7, 9)}-{user.phone.slice(9, 11)}
              </p>
            </div>
            {!editing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
              >
                <Icon name="Pencil" size={14} />
                Изменить
              </button>
            )}
          </div>

          {editing && (
            <div className="space-y-4 mb-6 border-t border-border pt-5">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Имя</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Новый пароль (необязательно)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Оставьте пустым, если не меняете"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {editPassword && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={editConfirm}
                    onChange={(e) => setEditConfirm(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}
              {editError && (
                <div className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <Icon name="CheckCircle" size={14} />
                  {editSuccess}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

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

        <div className="border-t border-border pt-4">
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Удалить аккаунт
            </button>
          ) : (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-3">
              <p className="text-sm text-foreground">
                Вы уверены? Все данные будут удалены без возможности восстановления.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="px-6 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Удаление..." : "Да, удалить"}
                </button>
                <button
                  onClick={() => setShowDelete(false)}
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            onClick={handleQuickLogin}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Ваше имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => handlePhoneChange(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Минимум 6 символов" : "Ваш пароль"}
                className="w-full px-4 py-3 pr-12 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                onChange={(e) => setRememberMe(e.target.checked)}
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
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-xs text-muted-foreground">Запомнить данные для входа</span>
              </label>

              <label className="flex items-start gap-2 text-left cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Я даю{" "}
                  <button
                    type="button"
                    onClick={() => setShowPrivacy(true)}
                    className="text-primary underline"
                  >
                    согласие на обработку персональных данных
                  </button>{" "}
                  и принимаю{" "}
                  <button
                    type="button"
                    onClick={() => setShowPrivacy(true)}
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
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setConfirmPassword("");
            }}
            className="text-sm text-primary hover:underline"
          >
            {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
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
                информацию, которую вы предоставляете при регистрации: имя, номер
                телефона.
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
};

export default Profile;