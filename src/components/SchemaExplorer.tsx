import { useState } from "react";
import { ChevronRight, ChevronDown, Table, Key, Search, RefreshCw, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSchema } from "@/hooks/useSchema";

interface SchemaExplorerProps {
  onTableSelect?: (tableName: string) => void;
  onFieldSelect?: (tableName: string, fieldName: string) => void;
}

const SchemaExplorer = ({ onTableSelect, onFieldSelect }: SchemaExplorerProps) => {
  const { schema, isLoading } = useSchema();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const filteredSchema = schema.filter(table => 
    table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.fields.some(field => field.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalFields = schema.reduce((acc, t) => acc + t.fields.length, 0);

  return (
    <div className="h-full flex flex-col bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sidebar-foreground">Schema Explorer</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tables & fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-sidebar-accent border-sidebar-border text-sm"
          />
        </div>
      </div>

      {/* Tables List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading schema...</span>
            </div>
          ) : filteredSchema.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? "No tables found" : "No schema loaded"}
            </div>
          ) : (
            filteredSchema.map((table) => (
              <div key={table.name} className="mb-1">
                {/* Table Header */}
                <button
                  onClick={() => {
                    toggleTable(table.name);
                    onTableSelect?.(table.name);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group"
                >
                  {expandedTables.has(table.name) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Table className="w-4 h-4 text-schema-table" />
                  <span className="text-sm font-medium text-sidebar-foreground group-hover:text-foreground truncate flex-1 text-left">
                    {table.name}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {table.fields.length}
                  </span>
                </button>

                {/* Fields */}
                {expandedTables.has(table.name) && (
                  <div className="ml-6 pl-2 border-l border-sidebar-border">
                    {table.fields.map((field) => (
                      <button
                        key={field.name}
                        onClick={() => onFieldSelect?.(table.name, field.name)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
                      >
                        {field.isPrimary ? (
                          <Key className="w-3.5 h-3.5 text-syntax-field flex-shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-schema-field" />
                          </div>
                        )}
                        <span className="text-sm text-sidebar-foreground truncate flex-1">
                          {field.name}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                          {field.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Stats */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{schema.length} Tables</span>
          <span>{totalFields.toLocaleString()} Fields</span>
        </div>
      </div>
    </div>
  );
};

export default SchemaExplorer;
