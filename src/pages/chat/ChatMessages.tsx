import { forwardRef } from "react";
import Icon from "@/components/ui/icon";
import type { Message } from "./chat-types";

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  isPaying: boolean;
  isPaid: boolean;
  onPayment: (amount: number, description: string) => void;
  onConfirmPayment: () => void;
}

const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, isTyping, isPaying, isPaid, onPayment, onConfirmPayment }, ref) => {
    return (
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {msg.files && msg.files.length > 0 && (
                <div className="mb-2 space-y-1">
                  {msg.files.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center gap-2 text-xs opacity-80"
                    >
                      <Icon name="Paperclip" size={12} />
                      {f.name} ({f.size})
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <span className="text-[10px] opacity-50 mt-1 block">{msg.time}</span>

              {msg.paymentAmount && msg.paymentDescription && !isPaid && (
                <button
                  onClick={() => onPayment(msg.paymentAmount!, msg.paymentDescription!)}
                  disabled={isPaying}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Icon name="CreditCard" size={16} />
                  {isPaying ? "Создаю платёж..." : `Оплатить ${msg.paymentAmount.toLocaleString("ru-RU")} ₽`}
                </button>
              )}

              {msg.showConfirmPayment && !isPaid && (
                <button
                  onClick={onConfirmPayment}
                  className="mt-2 w-full bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="CheckCircle" size={16} />
                  Я оплатил(а)
                </button>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={ref} />
      </div>
    );
  }
);

ChatMessages.displayName = "ChatMessages";

export default ChatMessages;
