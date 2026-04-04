import Icon from "@/components/ui/icon";

interface PrivacyModalProps {
  onClose: () => void;
}

const PrivacyModal = ({ onClose }: PrivacyModalProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Политика конфиденциальности
          </h2>
          <button
            onClick={onClose}
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
          onClick={onClose}
          className="mt-4 w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Понятно
        </button>
      </div>
    </div>
  );
};

export default PrivacyModal;
