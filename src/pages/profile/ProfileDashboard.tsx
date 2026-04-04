import Icon from "@/components/ui/icon";
import { UserProfile } from "@/lib/auth";

interface ProfileDashboardProps {
  user: UserProfile;
  stats: { orders: number; spent: number; completed: number };
  editing: boolean;
  editName: string;
  editPassword: string;
  editConfirm: string;
  editError: string;
  editSuccess: string;
  saving: boolean;
  showDelete: boolean;
  deleting: boolean;
  onStartEdit: () => void;
  onSetEditName: (v: string) => void;
  onSetEditPassword: (v: string) => void;
  onSetEditConfirm: (v: string) => void;
  onSaveProfile: () => void;
  onCancelEdit: () => void;
  onLogout: () => void;
  onShowDelete: (v: boolean) => void;
  onDeleteAccount: () => void;
}

const ProfileDashboard = ({
  user,
  stats,
  editing,
  editName,
  editPassword,
  editConfirm,
  editError,
  editSuccess,
  saving,
  showDelete,
  deleting,
  onStartEdit,
  onSetEditName,
  onSetEditPassword,
  onSetEditConfirm,
  onSaveProfile,
  onCancelEdit,
  onLogout,
  onShowDelete,
  onDeleteAccount,
}: ProfileDashboardProps) => {
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
              onClick={onStartEdit}
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
                onChange={(e) => onSetEditName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Новый пароль (необязательно)</label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => onSetEditPassword(e.target.value)}
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
                  onChange={(e) => onSetEditConfirm(e.target.value)}
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
                onClick={onSaveProfile}
                disabled={saving}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                onClick={onCancelEdit}
                className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.orders}</div>
            <div className="text-xs text-muted-foreground">Заказов</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-accent">{stats.spent.toLocaleString("ru-RU")} ₽</div>
            <div className="text-xs text-muted-foreground">Потрачено</div>
          </div>
          <div className="bg-secondary rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Выполнено</div>
          </div>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="w-full bg-secondary text-secondary-foreground py-3 rounded-lg text-sm hover:bg-destructive/20 hover:text-destructive transition-colors"
      >
        Выйти из аккаунта
      </button>

      <div className="border-t border-border pt-4">
        {!showDelete ? (
          <button
            onClick={() => onShowDelete(true)}
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
                onClick={onDeleteAccount}
                disabled={deleting}
                className="px-6 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleting ? "Удаление..." : "Да, удалить"}
              </button>
              <button
                onClick={() => onShowDelete(false)}
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
};

export default ProfileDashboard;
