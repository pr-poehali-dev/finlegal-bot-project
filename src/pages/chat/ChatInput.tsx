import { forwardRef } from "react";
import Icon from "@/components/ui/icon";

interface ChatInputProps {
  input: string;
  isTyping: boolean;
  attachedFiles: File[];
  onInputChange: (value: string) => void;
  onSend: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onAttachClick: () => void;
}

const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ input, isTyping, attachedFiles, onInputChange, onSend, onFileChange, onRemoveFile, onAttachClick }, ref) => {
    return (
      <>
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2 px-1">
            {attachedFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-lg"
              >
                <Icon name="File" size={12} />
                {f.name}
                <button
                  onClick={() => onRemoveFile(i)}
                  className="ml-1 hover:text-destructive"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            ref={ref}
            type="file"
            multiple
            onChange={onFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.jpg,.png,.rtf"
          />
          <button
            onClick={onAttachClick}
            className="p-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Icon name="Paperclip" size={18} />
          </button>
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Введите сообщение..."
            className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={onSend}
            disabled={isTyping}
            className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Icon name="Send" size={18} />
          </button>
        </div>
      </>
    );
  }
);

ChatInput.displayName = "ChatInput";

export default ChatInput;
