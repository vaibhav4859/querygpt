import { useState } from "react";
import { ListTodo, Link2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useJira, type JiraIssueListItem, type JiraIssueDetail } from "@/hooks/useJira";

interface JiraPanelProps {
  selectedIssue: JiraIssueDetail | null;
  onSelectIssue: (issue: JiraIssueDetail | null) => void;
}

export default function JiraPanel({ selectedIssue, onSelectIssue }: JiraPanelProps) {
  const { isAuthenticated, user } = useAuth();
  const {
    listMyIssues,
    fetchIssue,
    isLoadingList,
    isLoadingIssue,
    error,
    clearError,
  } = useJira();

  const [listOpen, setListOpen] = useState(false);
  const [myIssues, setMyIssues] = useState<JiraIssueListItem[]>([]);
  const [keyOrUrlInput, setKeyOrUrlInput] = useState("");

  const handleListMyJiras = async () => {
    if (!user?.email) return;
    setListOpen(true);
    const issues = await listMyIssues(user.email);
    setMyIssues(issues);
  };

  const handleSelectFromList = async (item: JiraIssueListItem) => {
    if (!user?.email) return;
    const detail = await fetchIssue(item.key, user.email);
    if (detail) {
      onSelectIssue(detail);
      setListOpen(false);
    }
  };

  const handleFetchByKey = async () => {
    if (!keyOrUrlInput.trim()) return;
    const detail = await fetchIssue(keyOrUrlInput.trim(), user?.email ?? "");
    if (detail) {
      onSelectIssue(detail);
      setKeyOrUrlInput("");
    }
  };

  const handleClearIssue = () => {
    onSelectIssue(null);
    clearError();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {isAuthenticated && user?.email && (
          <Popover open={listOpen} onOpenChange={setListOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-border bg-card hover:bg-accent/50"
                onClick={handleListMyJiras}
                disabled={isLoadingList}
              >
                {isLoadingList ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ListTodo className="w-4 h-4" />
                )}
                List my Jiras
              </Button>
            </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0 bg-popover border-border" align="start">
                <div className="px-3 py-2.5 border-b border-border text-sm font-medium text-foreground">
                  Your Jiras (newest first) — click to use for query
                </div>
                <ScrollArea className="h-64">
                  {isLoadingList ? (
                    <div className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading your issues…
                    </div>
                  ) : myIssues.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground text-center">
                      No issues found. Try fetching by key below.
                    </p>
                  ) : (
                    <ul className="p-2 space-y-1">
                      {myIssues.map((item) => (
                        <li key={item.key}>
                          <button
                            type="button"
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-lg text-sm",
                              "border border-transparent hover:border-border hover:bg-accent/50",
                              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1"
                            )}
                            onClick={() => handleSelectFromList(item)}
                          >
                            <span className="font-mono font-semibold text-primary">
                              {item.key}
                            </span>
                            <p className="text-foreground mt-0.5 line-clamp-2">
                              {item.summary || "—"}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </PopoverContent>
          </Popover>
        )}
        {isAuthenticated && user?.email && (
          <span className="text-xs font-medium text-muted-foreground px-1 shrink-0">OR</span>
        )}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-sm">
          <Link2 className="w-4 h-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder="Jira key or URL (e.g. CAV-1868)"
            value={keyOrUrlInput}
            onChange={(e) => setKeyOrUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetchByKey()}
            className="h-9 bg-background border-border text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 h-9"
            onClick={handleFetchByKey}
            disabled={!keyOrUrlInput.trim() || isLoadingIssue}
          >
            {isLoadingIssue ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Fetch"
            )}
          </Button>
        </div>
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground w-full">
            Sign in with Google to list your Jiras. You can still fetch any issue by key or URL above.
          </p>
        )}
      </div>

      {selectedIssue && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-primary/5 p-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary mb-0.5">
              Using Jira context
            </p>
            <p className="text-sm text-foreground truncate" title={selectedIssue.summary}>
              <span className="font-mono font-medium">{selectedIssue.key}</span>
              {selectedIssue.summary ? ` — ${selectedIssue.summary}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleClearIssue}
            aria-label="Clear Jira context"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          {error}
          <button
            type="button"
            onClick={clearError}
            className="underline hover:no-underline"
          >
            Dismiss
          </button>
        </p>
      )}
    </div>
  );
}
