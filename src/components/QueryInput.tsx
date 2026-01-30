import { useState, useRef, KeyboardEvent } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const QueryInput = ({ onSubmit, isLoading = false, placeholder }: QueryInputProps) => {
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
      setQuery("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-accent/50 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
      <div className="relative bg-card border border-border rounded-xl p-2">
        <Textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask a question in natural language... e.g., 'Show me all accounts with opportunities over $100k'"}
          className="min-h-[80px] max-h-[200px] bg-transparent border-0 focus-visible:ring-0 resize-none text-foreground placeholder:text-muted-foreground"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>AI-powered SOQL generation</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!query.trim() || isLoading}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Generate Query
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QueryInput;
