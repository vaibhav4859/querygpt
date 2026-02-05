import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from "@/components/Header";
import SchemaExplorer from "@/components/SchemaExplorer";
import QueryInput from "@/components/QueryInput";
import ChatHistory, { ChatMessage } from "@/components/ChatHistory";
import ExampleQueries from "@/components/ExampleQueries";
import HistoryPanel from "@/components/HistoryPanel";
import JiraPanel from "@/components/JiraPanel";
import { useQueryGeneration } from "@/hooks/useQueryGeneration";
import { useAuth } from "@/hooks/useAuth";
import type { JiraIssueDetail } from "@/hooks/useJira";
import { loadSchema } from "@/data/schema";
import type { TableSchema } from "@/data/schema";
import type { SchemaContext, ColumnDescriptionEntry, ColumnToTableMapping } from "@/hooks/useQueryGeneration";

const TABLE_DESCRIPTIONS_URL = "/table-descriptions.json";
const COLUMN_DESCRIPTIONS_URL = "/column-descriptions.json";
const TABLE_RELATIONSHIPS_URL = "/table-relationships.json";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState("lbpl");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [schemaContext, setSchemaContext] = useState<SchemaContext | null>(null);
  const [selectedJiraIssue, setSelectedJiraIssue] = useState<JiraIssueDetail | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const {
    suggestTables,
    generateQuery,
    endSession,
    hasActiveSession,
    isLoading,
    isSuggestingTables,
  } = useQueryGeneration();

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  useEffect(() => {
    endSession();
  }, [selectedTenant]);

  useEffect(() => {
    Promise.all([
      fetch(TABLE_DESCRIPTIONS_URL).then((r) => r.json()),
      fetch(COLUMN_DESCRIPTIONS_URL).then((r) => r.json()),
      fetch(TABLE_RELATIONSHIPS_URL)
        .then((r) => r.json())
        .then((data: { relationships?: SchemaContext["relationships"]; columnToTableMappings?: ColumnToTableMapping[] }) => ({
          relationships: data.relationships ?? [],
          columnToTableMappings: data.columnToTableMappings ?? [],
        }))
        .catch(() => ({ relationships: [] as SchemaContext["relationships"], columnToTableMappings: [] as ColumnToTableMapping[] })),
      loadSchema(),
    ]).then(
      ([
        tableDescriptions,
        columnDescriptions,
        { relationships, columnToTableMappings },
        schema,
      ]: [
        Record<string, string>,
        Record<string, Record<string, ColumnDescriptionEntry>>,
        { relationships: SchemaContext["relationships"]; columnToTableMappings: ColumnToTableMapping[] },
        TableSchema[],
      ]) => {
        setSchemaContext({
          tableDescriptions,
          columnDescriptions,
          schema,
          relationships,
          columnToTableMappings,
        });
      }
    );
  }, []);

  const handleHistoryClick = () => {
    setHistoryPanelOpen(true);
  };

  const handleSubmit = async (query: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (!schemaContext) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "assistant",
          content: "Schema is still loading. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    if (hasActiveSession) {
      const result = await generateQuery(query, selectedTenant);
      if (result) {
        const sqlMessage: ChatMessage = {
          id: crypto.randomUUID(),
          type: "assistant",
          timestamp: new Date(),
          content: result.error ? result.error : "Here's your optimized SQL query:",
          query: result.error ? undefined : result.query,
          explanation: result.explanation,
          optimizations: result.optimizations,
        };
        setMessages((prev) => [...prev, sqlMessage]);
      }
      return;
    }

    try {
      const suggested = await suggestTables(
        query,
        selectedTenant,
        schemaContext.tableDescriptions,
        selectedJiraIssue
      );

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        type: "assistant",
        content: "I'm planning to use the tables below to generate the query.",
        timestamp: new Date(),
        tableAgent: { suggestedTables: suggested },
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to suggest tables. Please try again.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "assistant",
          content: errorMsg,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleTableConfirm = async (
    messageId: string,
    selectedTables: string[]
  ) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const userMessage = messages[idx - 1];
    const naturalQuery =
      userMessage?.type === "user" ? userMessage.content : "";

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.tableAgent
          ? { ...m, tableAgent: { ...m.tableAgent, confirmedTables: selectedTables } }
          : m
      )
    );

    if (!schemaContext || !naturalQuery) return;

    const result = await generateQuery(
      naturalQuery,
      selectedTenant,
      selectedTables,
      schemaContext,
      selectedJiraIssue
    );

    if (result) {
      const sqlMessage: ChatMessage = {
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
      setMessages((prev) => [...prev, sqlMessage]);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isSuggestingTables]);

  const hasMessages = messages.length > 0;
  const tableDescriptions = schemaContext?.tableDescriptions ?? {};

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        selectedTenant={selectedTenant}
        onTenantChange={setSelectedTenant}
        onHistoryClick={handleHistoryClick}
        onLogoClick={() => {
          endSession();
          setMessages([]);
          setSelectedJiraIssue(null);
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`${
            sidebarOpen ? "w-72" : "w-0"
          } transition-all duration-300 overflow-hidden border-r border-border`}
        >
          <SchemaExplorer />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-2 border-b border-border shrink-0">
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

          <ScrollArea className="flex-1 min-h-0 min-w-0" ref={scrollRef}>
            <div className="max-w-4xl mx-auto px-6 py-6 pl-6 pr-8 min-w-0 w-full">
              {!hasMessages && (
                <div className="py-12">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground mb-3">
                      Ask anything about your SalesCode data
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                      Describe what you need in plain English. I'll suggest
                      relevant tables for you to confirm, then generate an
                      optimized SQL query.
                    </p>
                  </div>
                  <ExampleQueries onSelect={handleSubmit} />
                </div>
              )}

              <ChatHistory
                messages={messages}
                isLoading={isLoading}
                isSuggestingTables={isSuggestingTables}
                tableDescriptions={tableDescriptions}
                onTableConfirm={handleTableConfirm}
              />
            </div>
          </ScrollArea>

          <div className="border-t border-border px-6 py-6 pl-6 pr-8 shrink-0">
            <div className="max-w-4xl mx-auto space-y-3">
              <JiraPanel
                selectedIssue={selectedJiraIssue}
                onSelectIssue={setSelectedJiraIssue}
                contextLocked={!!selectedJiraIssue && (hasActiveSession || isLoading || isSuggestingTables || messages.length > 0)}
              />
              <QueryInput
                onSubmit={handleSubmit}
                isLoading={isLoading || isSuggestingTables}
                placeholder={
                  selectedJiraIssue
                    ? "Ask for SQL using the Jira report above (e.g. generate the report query)"
                    : undefined
                }
              />
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
