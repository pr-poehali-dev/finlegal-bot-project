import { useState } from "react";
import Icon from "@/components/ui/icon";

const SETTINGS_KEY = "jurbot_settings";

interface SettingsData {
  autoDownload: boolean;
  exportFormat: string;
}

const defaultSettings: SettingsData = {
  autoDownload: true,
  exportFormat: "txt",
};

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

const Settings = () => {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const update = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const Toggle = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors relative ${
        value ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          value ? "left-5" : "left-1"
        }`}
      />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Настройки</h1>
          <p className="text-muted-foreground text-sm">Управление параметрами приложения</p>
        </div>
        {hasChanges && (
          <span className="text-xs text-muted-foreground">Есть несохраненные изменения</span>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="Download" size={16} className="text-primary" />
            Экспорт
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-muted-foreground">Автоматическая загрузка результатов</span>
              <Toggle
                value={settings.autoDownload}
                onChange={(v) => update("autoDownload", v)}
              />
            </label>

            <div>
              <span className="text-sm text-muted-foreground block mb-2">Формат по умолчанию</span>
              <div className="flex gap-2">
                {["txt", "md", "json"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => update("exportFormat", fmt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      settings.exportFormat === fmt
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
      </div>

      <button
        onClick={handleSave}
        disabled={!hasChanges}
        className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          hasChanges
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : saved
              ? "bg-green-600/20 text-green-400 cursor-default"
              : "bg-secondary text-muted-foreground cursor-default"
        }`}
      >
        {saved ? (
          <>
            <Icon name="Check" size={16} />
            Настройки сохранены
          </>
        ) : (
          <>
            <Icon name="Save" size={16} />
            Сохранить настройки
          </>
        )}
      </button>
    </div>
  );
};

export default Settings;