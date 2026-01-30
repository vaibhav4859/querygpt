import { User, Bot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import QueryResult from "./QueryResult";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  query?: string;
  explanation?: string;
  optimizations?: string[];
}

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

const ChatHistory = ({ messages, isLoading }: ChatHistoryProps) => {
  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-4",
            message.type === "user" ? "flex-row-reverse" : ""
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              message.type === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground"
            )}
          >
            {message.type === "user" ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>

          {/* Content */}
          <div
            className={cn(
              "flex-1 space-y-3",
              message.type === "user" ? "text-right" : ""
            )}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{message.type === "user" ? "You" : "SalesCode QueryGPT"}</span>
              <Clock className="w-3 h-3" />
              <span>
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {message.type === "user" ? (
              <div className="inline-block bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-left">
                <p className="text-foreground">{message.content}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {message.content && (
                  <p className="text-foreground">{message.content}</p>
                )}
                {message.query && (
                  <QueryResult
                    query={message.query}
                    explanation={message.explanation}
                    optimizations={message.optimizations}
                    isOptimized={true}
                    executionTime="~120ms"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Loading State */}
      {isLoading && (
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <span>SalesCode QueryGPT</span>
              <span>is thinking...</span>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-shimmer rounded" />
              <div className="h-4 w-1/2 animate-shimmer rounded" />
              <div className="h-24 w-full animate-shimmer rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
