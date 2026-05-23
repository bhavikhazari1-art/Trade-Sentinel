import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, PlusCircle, BarChart3,
  Brain, CalendarDays, Target, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/",          icon: LayoutDashboard, label: "Home"     },
  { path: "/add",       icon: PlusCircle,      label: "Add"      },
  { path: "/analytics", icon: BarChart3,        label: "Stats"    },
  { path: "/ai",        icon: Brain,            label: "AI"       },
  { path: "/goals",     icon: Target,           label: "Goals"    },
  { path: "/calendar",  icon: CalendarDays,     label: "Calendar" },
  { path: "/profile",   icon: User,             label: "Profile"  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Scrollable content area */}
      <main className="flex-1 min-h-0 scroll-container">
        <div className="page-enter max-w-lg mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Bottom navigation bar */}
      <nav
        className="flex-shrink-0 border-t border-white/[0.06] bg-sidebar/95 backdrop-blur-2xl"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
      >
        <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link key={path} href={path}>
                <button
                  data-testid={`nav-${label.toLowerCase()}`}
                  className="relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 transition-all duration-200 active:scale-90"
                  style={{ minWidth: 40, minHeight: 52 }}
                >
                  {active && <span className="nav-active-pill" />}
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.7}
                    className={cn(
                      "relative z-10 transition-colors duration-200",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className={cn(
                    "relative z-10 text-[9px] font-semibold tracking-wide leading-none transition-colors duration-200",
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
