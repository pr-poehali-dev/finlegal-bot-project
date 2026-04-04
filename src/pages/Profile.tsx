import { useState, useEffect } from "react";
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
  getUserStats,
  UserProfile,
} from "@/lib/auth";
import ProfileDashboard from "./profile/ProfileDashboard";
import AuthForm from "./profile/AuthForm";
import PrivacyModal from "./profile/PrivacyModal";

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
  const [stats, setStats] = useState({ orders: 0, spent: 0, completed: 0 });

  useEffect(() => {
    if (user) {
      getUserStats().then(setStats).catch(() => { /* ignore */ });
    }
  }, [user]);

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
      <ProfileDashboard
        user={user}
        stats={stats}
        editing={editing}
        editName={editName}
        editPassword={editPassword}
        editConfirm={editConfirm}
        editError={editError}
        editSuccess={editSuccess}
        saving={saving}
        showDelete={showDelete}
        deleting={deleting}
        onStartEdit={handleStartEdit}
        onSetEditName={setEditName}
        onSetEditPassword={setEditPassword}
        onSetEditConfirm={setEditConfirm}
        onSaveProfile={handleSaveProfile}
        onCancelEdit={() => setEditing(false)}
        onLogout={handleLogout}
        onShowDelete={setShowDelete}
        onDeleteAccount={handleDeleteAccount}
      />
    );
  }

  return (
    <>
      <AuthForm
        mode={mode}
        phone={phone}
        name={name}
        password={password}
        confirmPassword={confirmPassword}
        rememberMe={rememberMe}
        agreedToTerms={agreedToTerms}
        showPassword={showPassword}
        loading={loading}
        error={error}
        hasSavedCreds={hasSavedCreds}
        formatPhone={formatPhone}
        onPhoneChange={handlePhoneChange}
        onSetName={setName}
        onSetPassword={setPassword}
        onSetConfirmPassword={setConfirmPassword}
        onSetRememberMe={setRememberMe}
        onSetAgreedToTerms={setAgreedToTerms}
        onSetShowPassword={setShowPassword}
        onSubmit={handleSubmit}
        onQuickLogin={handleQuickLogin}
        onSwitchMode={() => {
          setMode(mode === "login" ? "register" : "login");
          setError("");
          setConfirmPassword("");
        }}
        onShowPrivacy={() => setShowPrivacy(true)}
      />
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </>
  );
};

export default Profile;
