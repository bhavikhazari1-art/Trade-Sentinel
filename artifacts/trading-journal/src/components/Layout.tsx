import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Brain,
  CalendarDays,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/add", icon: PlusCircle, label: "Add Trade" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/ai", icon: Brain, label: "AI Coach" },
  { path: "/calendar", icon: CalendarDays, label: "Calendar" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main scrollable content */}
      <div className="flex-1 min-h-0 scroll-container">
        <div className="page-enter">{children}</div>
      </div>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 border-t border-border/60 bg-sidebar/95 backdrop-blur-xl pb-safe">
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link key={path} href={path}>
                <button
                  data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "relative p-1.5 rounded-xl transition-all duration-200",
                    active && "bg-primary/15 pulse-gold"
                  )}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                    {active && (
                      <span className="absolute inset-0 rounded-xl bg-primary/10 blur-sm" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium tracking-wide transition-all duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
