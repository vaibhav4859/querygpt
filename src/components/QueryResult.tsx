import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryResultProps {
  query: string;
  explanation?: string;
  optimizations?: string[];
}

const QueryResult = ({
  query,
  explanation,
  optimizations = [],
}: QueryResultProps) => {
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting for SOQL
  const highlightQuery = (q: string) => {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'ASC', 'DESC', 'LIKE', 'IN', 'NOT', 'NULL', 'TRUE', 'FALSE'];
    let highlighted = q;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="text-syntax-keyword font-semibold">${keyword}</span>`);
    });
    
    // Highlight strings
    highlighted = highlighted.replace(/'([^']*)'/g, '<span class="text-syntax-string">\'$1\'</span>');
    
    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-syntax-number">$1</span>');
    
    return highlighted;
  };

  return (
    <div className="space-y-4">
      {/* Query Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
          <span className="text-sm font-medium text-foreground">Generated SQL</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-primary" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
        </div>
        
        <div className="p-4">
          <pre className="code-block p-4 text-sm font-mono overflow-x-auto">
            <code dangerouslySetInnerHTML={{ __html: highlightQuery(query) }} />
          </pre>
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">Explanation</span>
            {showExplanation ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          <div className={cn(
            "overflow-hidden transition-all duration-300",
            showExplanation ? "max-h-96" : "max-h-0"
          )}>
            <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
              {explanation}
            </div>
          </div>
        </div>
      )}

      {/* Optimizations Applied */}
      {optimizations.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Optimizations Applied</span>
          </div>
          <ul className="space-y-2">
            {optimizations.map((opt, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{opt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QueryResult;
