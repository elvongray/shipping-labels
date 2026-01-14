import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Plus,
  Receipt,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ConfirmDialog from "@/features/common/ConfirmDialog";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Create", to: "/upload", icon: Plus, disabled: true },
  { label: "Upload", to: "/upload", icon: Package, isWizard: true },
  { label: "History", to: "/upload", icon: Receipt, disabled: true },
  { label: "Pricing", to: "/upload", icon: CreditCard, disabled: true },
  { label: "Billing", to: "/upload", icon: CreditCard, disabled: true },
  { label: "Settings", to: "/upload", icon: Settings, disabled: true },
  { label: "Support", to: "/upload", icon: LifeBuoy, disabled: true },
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
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const matches = useRouterState({
    select: (state) => state.matches,
  });
  const highlightWizard = isWizardPath(pathname);
  const lastMatch = matches[matches.length - 1];
  const importId = lastMatch?.params?.importId as string | undefined;
  const stepMeta = getStepMeta(pathname, importId);
  const sectionHeaderClass = "flex h-16 items-center justify-between px-4";
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <SidebarProvider className="min-h-screen w-full flex-col bg-muted/30">
      <header className="flex h-14 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SidebarTrigger className="md:hidden" />
          <div className="h-8 w-8 rounded-md bg-primary/10" />
          <span>Shipping Labels</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-muted" />
          <span>Elvon Gray</span>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className={`${sectionHeaderClass} border-b py-0`}>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Navigation
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.isWizard
                  ? highlightWizard
                  : pathname === item.to;

                return (
                  <SidebarMenuItem key={item.label}>
                    {item.disabled ? (
                      <SidebarMenuButton
                        disabled
                        tooltip={`${item.label} (coming soon)`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link to={item.to}>
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="bg-muted/30 min-w-0">
          <div className="flex min-h-full min-w-0 flex-col">
            <div className="border-b bg-background">
              <div className={sectionHeaderClass}>
                <div>
                  <p className="text-sm text-muted-foreground">Step</p>
                  <p className="text-lg font-semibold">{stepMeta.title}</p>
                </div>
                {stepMeta.showActions ? (
                  <div className="flex items-center gap-2">
                    {stepMeta.backTo ? (
                      stepMeta.confirmBack ? (
                        <Button
                          variant="outline"
                          onClick={() => setConfirmOpen(true)}
                        >
                          {stepMeta.backLabel}
                        </Button>
                      ) : (
                        <Button asChild variant="outline">
                          <Link to={stepMeta.backTo}>{stepMeta.backLabel}</Link>
                        </Button>
                      )
                    ) : (
                      <Button variant="outline" disabled>
                        {stepMeta.backLabel}
                      </Button>
                    )}
                    {stepMeta.nextTo ? (
                      <Button asChild>
                        <Link to={stepMeta.nextTo}>{stepMeta.nextLabel}</Link>
                      </Button>
                    ) : (
                      <Button disabled>{stepMeta.nextLabel}</Button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="p-6 min-w-0">{children}</div>
          </div>
        </SidebarInset>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Leave this review?"
        description="Going back will discard any unsaved edits for this import."
        confirmLabel="Go back to upload"
        cancelLabel="Stay here"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          navigate({ to: "/upload" });
        }}
      />
    </SidebarProvider>
  );
}

function getStepMeta(pathname: string, importId?: string) {
  if (pathname.startsWith("/upload")) {
    return {
      title: "Upload CSV",
      showActions: true,
      backLabel: "Back",
      nextLabel: "Continue",
    };
  }

  if (pathname.startsWith("/review")) {
    return {
      title: "Review & Edit",
      showActions: true,
      backLabel: "Back",
      nextLabel: "Continue",
      backTo: "/upload",
      nextTo: importId ? `/shipping/${importId}` : undefined,
      confirmBack: true,
    };
  }

  if (pathname.startsWith("/shipping")) {
    return {
      title: "Select Shipping",
      showActions: true,
      backLabel: "Back",
      nextLabel: "Continue",
      backTo: importId ? `/review/${importId}` : undefined,
      nextTo: importId ? `/checkout/${importId}` : undefined,
    };
  }

  if (pathname.startsWith("/checkout")) {
    return {
      title: "Checkout",
      showActions: true,
      backLabel: "Back",
      nextLabel: "Purchase",
      backTo: importId ? `/shipping/${importId}` : undefined,
      nextTo: importId ? `/success/${importId}` : undefined,
    };
  }

  if (pathname.startsWith("/success")) {
    return {
      title: "Success",
      showActions: false,
      backLabel: "Back",
      nextLabel: "Continue",
    };
  }

  return {
    title: "Shipping Labels",
    showActions: false,
    backLabel: "Back",
    nextLabel: "Continue",
  };
}
