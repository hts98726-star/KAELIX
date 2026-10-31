"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Layers,
  SlidersHorizontal,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ShoppingBag,
  Package,
  UserPlus,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/actions/session";
import { roleHome, type SessionUser } from "@/lib/auth/roles";

const operatorNavigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { label: "Invoices", href: "/invoices", icon: ReceiptText },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Products", href: "/products", icon: Package },
  { label: "Plans", href: "/plans", icon: Layers },
  { label: "Checkout", href: "/checkout", icon: ShoppingBag },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Configuration", href: "/configuration", icon: SlidersHorizontal },
  { label: "Create account", href: "/signup", icon: UserPlus },
  { label: "Settings", href: "/settings", icon: Settings2 },
];
// Administrator-only destinations; the pages enforce this on the server too.
const adminOnly = ["Dashboard", "Reports", "Configuration", "Settings"];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const navigation =
    user.role === "CUSTOMER"
      ? [
          { label: "Customer Portal", href: "/portal", icon: LayoutDashboard },
          {
            label: "My subscriptions",
            href: "/portal/subscriptions",
            icon: CreditCard,
          },
          { label: "My invoices", href: "/portal/invoices", icon: ReceiptText },
        ]
      : user.role === "STAFF"
        ? [
            { label: "Staff Workspace", href: "/staff", icon: LayoutDashboard },
            ...operatorNavigation.filter(
              (item) => !adminOnly.includes(item.label),
            ),
          ]
        : operatorNavigation;
  const roleLabel =
    user.role === "ADMIN"
      ? "Administrator"
      : user.role === "STAFF"
        ? "Staff"
        : "Customer";
  const initials = user.email.slice(0, 2).toUpperCase();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const current =
    navigation.find((item) => item.href === pathname)?.label ?? "Workspace";

  function sidebar(isMobile = false) {
    const small = collapsed && !isMobile;
    return (
      <div className="flex h-full flex-col overflow-y-auto bg-white">
        <div
          className={cn(
            "flex h-[83px] shrink-0 items-center px-6",
            small && "justify-center px-0",
          )}
        >
          <Link
            href={roleHome(user.role)}
            aria-label="KAELIX PULSE home"
            onClick={() => setMobileOpen(false)}
          >
            <Brand compact={small} />
          </Link>
        </div>
        <div
          className={cn(
            "mx-4 mb-7 flex items-center gap-2.5 rounded-lg border bg-[#fcfcfe] px-3 py-3",
            small && "mx-3 justify-center px-0",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-white text-xs font-semibold text-primary">
            K.
          </div>
          {!small && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">Kaelix workspace</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {roleLabel} workspace
                </p>
              </div>
              <ShieldCheck className="size-3.5 text-muted-foreground" />
            </>
          )}
        </div>
        {!small && (
          <p className="mb-3 px-7 text-[9px] font-semibold tracking-[1.7px] text-muted-foreground">
            WORKSPACE
          </p>
        )}
        <nav aria-label="Main navigation" className="space-y-1.5 px-3">
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={small ? label : undefined}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium text-[#777786] outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                pathname === href && "bg-accent text-primary hover:bg-accent",
                small && "justify-center px-0",
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.7} />
              {!small && (
                <>
                  <span>{label}</span>
                </>
              )}
              {pathname === href && !small && (
                <span className="absolute inset-y-3 left-0 w-0.5 rounded bg-primary" />
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-4 pt-8 pb-5">
          {!small && (
            <div className="relative mb-5 overflow-hidden rounded-xl border border-[#e8e0fb] bg-gradient-to-br from-[#f8f5ff] to-[#f1edfc] p-4">
              <span className="absolute -top-5 -right-4 size-20 rounded-full border-[12px] border-white/40" />
              <Sparkles className="relative mb-2.5 size-5 text-primary" />
              <p className="relative text-xs font-semibold">
                A little less admin.
              </p>
              <p className="relative mt-1.5 text-[11px] leading-5 text-[#8d82a7]">
                A lot more possibilities.
                <br />
                Your subscriptions, in sync.
              </p>
              <Link
                href={
                  user.role === "CUSTOMER"
                    ? "/portal/subscriptions"
                    : "/subscriptions"
                }
                className="relative mt-3 flex items-center gap-2 text-[11px] font-semibold text-primary"
              >
                Explore subscriptions <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start px-2.5 text-xs",
              small && "justify-center px-0",
            )}
            onClick={() => setHelpOpen(true)}
            aria-label="Help and getting started"
          >
            <CircleHelp />
            {!small && "Help & getting started"}
          </Button>
          {!isMobile && (
            <Button
              variant="ghost"
              className={cn(
                "mt-2 w-full justify-start px-2.5 text-xs",
                small && "justify-center px-0",
              )}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              {!small && "Collapse sidebar"}
            </Button>
          )}
        </div>
        <div
          className={cn(
            "flex h-[74px] shrink-0 items-center gap-2.5 border-t px-6",
            small && "justify-center px-0",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eae2fb] text-[10px] font-semibold text-primary">
            {initials}
          </div>
          {!small && (
            <>
              <div className="flex-1">
                <p className="text-xs font-semibold">{roleLabel}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh font-sans">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg bg-primary px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r transition-[width] duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-[238px]",
        )}
      >
        {sidebar()}
      </aside>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="top-0 left-0 h-dvh max-h-dvh w-[280px] max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-0 p-0">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <DialogDescription className="sr-only">
            KAELIX PULSE workspace navigation
          </DialogDescription>
          {sidebar(true)}
        </DialogContent>
      </Dialog>
      <div
        className={cn(
          "min-w-0 transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[238px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b bg-white/95 px-4 backdrop-blur-md sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Workspace
            </span>
            <ChevronRight className="hidden size-3 text-[#c1c1ca] sm:block" />
            <span className="text-xs font-medium">{current}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search workspace"
              className="flex items-center gap-2 rounded-md px-2 py-2 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-4" />
              <span className="hidden text-xs md:inline">Quick navigation</span>
              <kbd className="hidden rounded border px-1 text-[9px] md:inline">
                ⌕
              </kbd>
            </button>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  className="relative"
                >
                  <Bell className="size-[17px]!" />
                  <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary ring-2 ring-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72">
                <DropdownMenuLabel className="block px-3 py-2 text-xs font-semibold">
                  Workspace updates
                </DropdownMenuLabel>
                <p className="px-3 py-3 text-xs leading-6 text-muted-foreground">
                  Welcome to KAELIX PULSE. Signup and checkout save to your
                  workspace. Dashboard charts remain sample data.
                </p>
                <div className="border-t px-3 pt-2 pb-1 text-[10px] text-muted-foreground">
                  Demo notification · October 31, 2026
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open account menu"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-[#eae2fb] text-[10px] font-semibold text-primary">
                    {initials}
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="block border-b px-3 py-2 text-xs">
                  {roleLabel}{" "}
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={roleHome(user.role)}>
                    <Settings2 /> My workspace
                  </Link>
                </DropdownMenuItem>
                <form action={logoutUser}>
                  <button
                    type="submit"
                    className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Log out
                  </button>
                </form>
                <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
                  <BookOpen /> Getting started
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1680px] p-4 sm:p-7 lg:px-9 lg:py-8"
        >
          {children}
        </main>
        <footer className="mx-4 flex flex-wrap items-center justify-between gap-3 border-t py-5 text-[10px] text-muted-foreground sm:mx-7 lg:mx-9">
          <span>© 2026 KAELIX PULSE. Built to keep you in rhythm.</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            {pathname === "/admin"
              ? "Demo analytics"
              : "Connected workspace"}{" "}
            <span className="text-[#ceccd6]">/</span> Odoo × Make-A-Ton
          </span>
        </footer>
      </div>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogTitle className="text-lg font-semibold">
            Find your way
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-muted-foreground">
            Jump to a page in your workspace.
          </DialogDescription>
          <div className="relative mt-5">
            <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search pages…"
              aria-label="Search pages"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-3 space-y-1">
            {navigation
              .filter((item) =>
                item.label.toLowerCase().includes(search.toLowerCase()),
              )
              .map(({ label, href, icon: Icon }) => (
                <Link
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  key={href}
                  href={href}
                  onClick={() => setSearchOpen(false)}
                >
                  <Icon className="size-4 text-primary" />
                  {label}
                  <ArrowUpRight className="ml-auto size-3 text-muted-foreground" />
                </Link>
              ))}
            {!navigation.some((item) =>
              item.label.toLowerCase().includes(search.toLowerCase()),
            ) && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No pages match your search.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <Badge>
            <Sparkles className="size-3" /> Welcome aboard
          </Badge>
          <DialogTitle className="mt-4 text-xl font-semibold">
            Your business. In rhythm.
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-7 text-muted-foreground">
            Explore your overview, search and filter subscriptions, or export a
            CSV from the demo dashboard. Create an account, then open Checkout
            to save a real subscription and draft invoice. Customers,
            subscriptions, and invoices show saved workspace records. Dashboard
            analytics and its quick-add form still use temporary sample data.
          </DialogDescription>
          <Button className="mt-5" onClick={() => setHelpOpen(false)}>
            Let’s get started <ArrowUpRight />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
