import { Lightbulb, Users, MapPin, Truck, ShoppingBag } from "lucide-react";

interface ExampleQueriesProps {
  onSelect: (query: string) => void;
}

const examples = [
  {
    icon: Users,
    label: "Active users by role",
    query: "Get all active users from ck_user table with their roles and last login date, grouped by role",
  },
  {
    icon: MapPin,
    label: "Outlet details by region",
    query: "Show outlet details from ck_outlet_details including name, address, and beat mapping for outlets created this month",
  },
  {
    icon: Truck,
    label: "DMS loadout summary",
    query: "Get loadout data from dms_loadout with product quantities, total value, and delivery status for the last 7 days",
  },
  {
    icon: ShoppingBag,
    label: "Order analytics",
    query: "Show order count and total amount from ck_order grouped by outlet and sorted by highest value",
  },
];

const ExampleQueries = ({ onSelect }: ExampleQueriesProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lightbulb className="w-4 h-4 text-primary" />
        <span className="text-sm">Try these example queries</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {examples.map((example, index) => {
          const Icon = example.icon;
          return (
            <button
              key={index}
              onClick={() => onSelect(example.query)}
              className="group flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-secondary/30 transition-all text-left"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm mb-1">
                  {example.label}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {example.query}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExampleQueries;
