import { useState, useRef, useEffect } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from "@/components/Header";
import SchemaExplorer from "@/components/SchemaExplorer";
import QueryInput from "@/components/QueryInput";
import ChatHistory, { ChatMessage } from "@/components/ChatHistory";
import ExampleQueries from "@/components/ExampleQueries";
import HistoryPanel from "@/components/HistoryPanel";
import { useQueryGeneration } from "@/hooks/useQueryGeneration";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState("lbpl");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { generateQuery, isLoading } = useQueryGeneration();

  const handleHistoryClick = () => {
    setHistoryPanelOpen(true);
  };

  const handleSubmit = async (query: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Generate AI response
    const result = await generateQuery(query, selectedTenant);
    
    if (result) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "assistant",
        timestamp: new Date(),
        content: result.error 
          ? result.error 
          : "Here's your optimized SQL query:",
        query: result.error ? undefined : result.query,
        explanation: result.explanation,
        optimizations: result.optimizations,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        selectedTenant={selectedTenant}
        onTenantChange={setSelectedTenant}
        onHistoryClick={handleHistoryClick}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Schema Sidebar */}
        <div
          className={`${
            sidebarOpen ? "w-72" : "w-0"
          } transition-all duration-300 overflow-hidden border-r border-border`}
        >
          <SchemaExplorer />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toggle Button */}
          <div className="p-2 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeft className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Chat Area */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-4xl mx-auto p-6">
              {!hasMessages && (
                <div className="py-12">
                  {/* Welcome */}
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground mb-3">
                      Ask anything about your SalesCode data
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      Describe what you need in plain English, and I'll generate optimized SQL queries instantly. 
                      I understand your schema and apply best practices automatically.
                    </p>
                  </div>

                  {/* Example Queries */}
                  <ExampleQueries onSelect={handleSubmit} />
                </div>
              )}

              {/* Messages */}
              <ChatHistory messages={messages} isLoading={isLoading} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border p-6">
            <div className="max-w-4xl mx-auto">
              <QueryInput onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>

      <HistoryPanel
        isOpen={historyPanelOpen}
        onClose={() => setHistoryPanelOpen(false)}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
};

export default Index;
