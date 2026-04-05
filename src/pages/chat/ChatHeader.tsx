import Icon from "@/components/ui/icon";
import type { Message } from "./chat-types";

interface ChatHeaderProps {
  serviceName: string | null;
  messages: Message[];
  onNewChat: () => void;
  onExport: (format: string) => void;
  preferredFormat: string;
}

const ChatHeader = ({ serviceName, onNewChat, onExport, preferredFormat }: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Чат-бот</h1>
        {serviceName && (
          <p className="text-xs text-primary">Услуга: {serviceName}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onNewChat}
          className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1"
        >
          <Icon name="Plus" size={12} />
          Новый чат
        </button>
        <button
          onClick={() => onExport(preferredFormat)}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1"
        >
          <Icon name="Download" size={12} />
          Скачать .{preferredFormat}
        </button>
        {["txt", "md", "json"]
          .filter((f) => f !== preferredFormat)
          .map((fmt) => (
            <button
              key={fmt}
              onClick={() => onExport(fmt)}
              className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1"
            >
              .{fmt}
            </button>
          ))}
      </div>
    </div>
  );
};

export default ChatHeader;
