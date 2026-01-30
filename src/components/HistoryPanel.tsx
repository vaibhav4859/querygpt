import { X, History } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

const HistoryPanel = ({ isOpen, onClose, isAuthenticated }: HistoryPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Query History</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-center text-muted-foreground">
          {isAuthenticated ? (
            <>
              Query history is not available yet. When this feature is supported,
              you'll be able to save and view your past queries.
            </>
          ) : (
            <>Sign in to save and view your query history once it's available.</>
          )}
        </p>
      </div>
    </div>
  );
};

export default HistoryPanel;
