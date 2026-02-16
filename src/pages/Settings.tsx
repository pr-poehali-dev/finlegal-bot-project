import { useState } from "react";
import Icon from "@/components/ui/icon";

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [emailNotify, setEmailNotify] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);
  const [exportFormat, setExportFormat] = useState("pdf");

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Настройки</h1>
        <p className="text-muted-foreground text-sm">Управление параметрами приложения</p>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="Bell" size={16} className="text-primary" />
            Уведомления
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-muted-foreground">Push-уведомления</span>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  notifications ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    notifications ? "left-5" : "left-1"
                  }`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-muted-foreground">Email-уведомления</span>
              <button
                onClick={() => setEmailNotify(!emailNotify)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  emailNotify ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    emailNotify ? "left-5" : "left-1"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="Download" size={16} className="text-primary" />
            Экспорт
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-muted-foreground">Автоматическая загрузка результатов</span>
              <button
                onClick={() => setAutoDownload(!autoDownload)}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  autoDownload ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    autoDownload ? "left-5" : "left-1"
                  }`}
                />
              </button>
            </label>

            <div>
              <span className="text-sm text-muted-foreground block mb-2">Формат по умолчанию</span>
              <div className="flex gap-2">
                {["pdf", "docx", "txt", "md"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      exportFormat === fmt
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    .{fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="CreditCard" size={16} className="text-primary" />
            Платежи
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Оплата проходит через защищённый сервис ЮKassa
          </p>
          <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground">
            Данные карт не сохраняются на нашем сервисе. Все транзакции защищены
            шифрованием PCI DSS.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
