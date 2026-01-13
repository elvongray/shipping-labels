import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Package,
  Plus,
  Receipt,
  Settings,
  LifeBuoy,
  CreditCard,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "../../components/ui/button";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Create", to: "/upload", icon: Plus },
  { label: "Upload", to: "/upload", icon: Package, isWizard: true },
  { label: "History", to: "/upload", icon: Receipt },
  { label: "Pricing", to: "/upload", icon: CreditCard },
  { label: "Billing", to: "/upload", icon: CreditCard },
  { label: "Settings", to: "/upload", icon: Settings },
  { label: "Support", to: "/upload", icon: LifeBuoy },
];

function isWizardPath(pathname: string) {
  return (
    pathname.startsWith("/upload") ||
    pathname.startsWith("/review") ||
    pathname.startsWith("/shipping") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/success")
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const highlightWizard = isWizardPath(pathname);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex h-14 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <div className="h-8 w-8 rounded-md bg-primary/10" />
          Shipping Labels
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-muted" />
          <span>Elvon Gray</span>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-[240px_1fr]">
        <aside className="border-r bg-background">
          <nav className="flex flex-col gap-1 p-4 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isWizard
                ? highlightWizard
                : pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 transition ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="p-6">
          <div className="mb-6 flex items-center justify-between rounded-lg border bg-background px-4 py-3">
            <div>
              <p className="text-sm text-muted-foreground">Step</p>
              <p className="text-lg font-semibold">Step Title</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">Back</Button>
              <Button>Continue</Button>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
