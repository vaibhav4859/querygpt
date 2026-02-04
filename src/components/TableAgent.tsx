import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TableAgentProps {
  suggestedTables: string[];
  confirmedTables?: string[];
  allTableNames: string[];
  tableDescriptions: Record<string, string>;
  onConfirm?: (selectedTables: string[]) => void;
  disabled?: boolean;
}

export default function TableAgent({
  suggestedTables,
  confirmedTables,
  allTableNames,
  tableDescriptions,
  onConfirm,
  disabled = false,
}: TableAgentProps) {
  const isConfirmed = confirmedTables != null && confirmedTables.length > 0;
  const [selected, setSelected] = useState<string[]>(() => suggestedTables);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Sync selected when suggestedTables change (e.g. new query)
  useEffect(() => {
    setSelected((prev) => {
      const suggestedSet = new Set(suggestedTables.map((t) => t.toLowerCase()));
      const kept = prev.filter((t) => suggestedSet.has(t.toLowerCase()));
      const added = suggestedTables.filter(
        (t) => !prev.some((p) => p.toLowerCase() === t.toLowerCase())
      );
      return [...kept, ...added].length > 0 ? [...kept, ...added] : prev;
    });
  }, [suggestedTables.join(",")]);

  const searchLower = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!searchLower) return [];
    return allTableNames.filter(
      (name) =>
        name.toLowerCase().includes(searchLower) &&
        !selected.some((s) => s.toLowerCase() === name.toLowerCase())
    );
  }, [allTableNames, searchLower, selected]);

  const remove = (table: string) => {
    setSelected((prev) => prev.filter((t) => t !== table));
  };

  const add = (table: string) => {
    if (!selected.some((t) => t.toLowerCase() === table.toLowerCase())) {
      setSelected((prev) => [...prev, table]);
    }
    setSearch("");
    setSearchFocused(false);
  };

  const handleConfirm = () => {
    onConfirm(selected.length > 0 ? selected : suggestedTables);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isConfirmed) {
    return (
      <div className="rounded-xl border border-border bg-card/50 shadow-sm overflow-hidden">
        <p className="text-sm text-muted-foreground px-4 pt-4 pb-2">
          Tables used for this query:
        </p>
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {confirmedTables!.map((table) => (
              <span
                key={table}
                className="inline-flex items-center rounded-md bg-muted px-2.5 py-1.5 text-sm font-medium text-foreground border border-border"
              >
                {table}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 shadow-sm overflow-hidden">
      <p className="text-sm text-muted-foreground px-4 pt-4 pb-2">
        I&apos;m planning to use the tables below to generate the query.
      </p>
      <div className="px-4 pb-4">
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <div className="bg-primary/10 text-primary px-3 py-2.5 font-semibold text-sm border-b border-border">
            Tables to be used:
          </div>
          <div className="p-3 space-y-3">
            <div ref={searchRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Table name"
                className="pl-9 h-9 bg-muted/30 border-border focus-visible:ring-2 focus-visible:ring-primary/20"
                disabled={disabled}
              />
              {searchFocused && searchResults.length > 0 && (
                <ul
                  className="absolute z-10 top-full left-0 right-0 mt-1 py-1 rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-auto"
                  role="listbox"
                >
                  {searchResults.slice(0, 12).map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none flex flex-col"
                        onClick={() => add(name)}
                      >
                        <span className="font-medium">{name}</span>
                        {tableDescriptions[name] && (
                          <span className="text-xs text-muted-foreground truncate">
                            {tableDescriptions[name]}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {selected.map((table) => (
                <span
                  key={table}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-sm font-medium text-foreground border border-border"
                >
                  {table}
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive/30"
                    onClick={() => remove(table)}
                    disabled={disabled}
                    aria-label={`Remove ${table}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="px-3 pb-3 pt-1">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={disabled || selected.length === 0}
              className={cn(
                "w-full h-10 font-medium bg-foreground text-background hover:bg-foreground/90",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              <Check className="w-4 h-4 mr-2" />
              Looks Good
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
