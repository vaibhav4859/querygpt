import { useState } from "react";
import { Database, History, ChevronDown, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { tenants } from "@/data/schema";
import LoginButton from "./LoginButton";

interface HeaderProps {
  selectedTenant: string;
  onTenantChange: (tenant: string) => void;
  onHistoryClick: () => void;
  onLogoClick?: () => void;
}

const Header = ({ selectedTenant, onTenantChange, onHistoryClick, onLogoClick }: HeaderProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredTenants = tenants.filter((tenant) =>
    tenant.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (tenant: string) => {
    onTenantChange(tenant);
    setOpen(false);
    setSearch("");
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Logo – click to clear chat and show fresh start */}
      <button
        type="button"
        onClick={onLogoClick}
        className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      >
        <div className="p-2 rounded-xl bg-primary/10">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            SalesCode <span className="text-primary">QueryGPT</span>
          </h1>
          <p className="text-xs text-muted-foreground">Natural Language to SQL</p>
        </div>
      </button>

      {/* Center - Tenant Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">{selectedTenant}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 bg-popover border-border" align="center">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 bg-background border-border"
              />
            </div>
          </div>
          <ScrollArea className="h-64">
            <div className="p-1">
              {filteredTenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tenants found
                </p>
              ) : (
                filteredTenants.map((tenant) => (
                  <button
                    key={tenant}
                    onClick={() => handleSelect(tenant)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                      tenant === selectedTenant
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground"
                    )}
                  >
                    <span>{tenant}</span>
                    {tenant === selectedTenant && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
          onClick={onHistoryClick}
        >
          <History className="w-5 h-5" />
        </Button>
        <LoginButton />
      </div>
    </header>
  );
};

export default Header;
