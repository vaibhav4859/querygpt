import { User, Bot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import QueryResult from "./QueryResult";
import TableAgent from "./TableAgent";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  query?: string;
  explanation?: string;
  optimizations?: string[];
  tableAgent?: { suggestedTables: string[] };
}

interface ChatHistoryProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  isSuggestingTables?: boolean;
  tableDescriptions?: Record<string, string>;
  onTableConfirm?: (messageId: string, selectedTables: string[]) => void;
}

const ChatHistory = ({
  messages,
  isLoading,
  isSuggestingTables,
  tableDescriptions = {},
  onTableConfirm,
}: ChatHistoryProps) => {
  if (messages.length === 0 && !isLoading && !isSuggestingTables) {
    return null;
  }

  const allTableNames = Object.keys(tableDescriptions);

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
              "flex-1 min-w-0 space-y-3 max-w-full",
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
              <div className="space-y-3 min-w-0 max-w-full overflow-hidden">
                {message.content && (
                  <div className="text-foreground space-y-2">
                    {message.content.split(/\n\n+/).map((block, i) => (
                      <div key={i}>
                        {block.split(/\n/).map((line, j) => {
                          const heading = line.match(/^###?\s*(.*)$/);
                          if (heading) {
                            return (
                              <div key={j} className="font-semibold text-foreground mt-3 first:mt-0">
                                {heading[1]}
                              </div>
                            );
                          }
                          return (
                            <p key={j} className="text-sm leading-relaxed">
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
                {message.tableAgent && onTableConfirm && (
                  <TableAgent
                    suggestedTables={message.tableAgent.suggestedTables}
                    allTableNames={allTableNames}
                    tableDescriptions={tableDescriptions}
                    onConfirm={(selected) => onTableConfirm(message.id, selected)}
                    disabled={isLoading}
                  />
                )}
                {message.query && (
                  <QueryResult
                    query={message.query}
                    explanation={message.explanation}
                    optimizations={message.optimizations}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Loading: suggesting tables */}
      {isSuggestingTables && (
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <span>SalesCode QueryGPT</span>
              <span>Suggesting tables…</span>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      )}

      {/* Loading: generating SQL */}
      {isLoading && (
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <span>SalesCode QueryGPT</span>
              <span>Generating your SQL query…</span>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
