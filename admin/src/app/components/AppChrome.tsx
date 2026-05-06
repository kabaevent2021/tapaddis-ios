"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  BusFront,
  Camera,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  MapPin,
  Menu,
  QrCode,
  Shield,
  Smartphone,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { AdminSession } from "@/lib/admin-auth";

/* ─── Types ─────────────────────────────────────────────────────────── */

type NavEntry = {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | null;
  badgeColor?: "red" | "amber" | "blue";
};

type NavGroup = {
  key: string;
  title: string;
  items: NavEntry[];
};

/* ─── Sidebar config per role ───────────────────────────────────────── */

function buildAdminNav(): NavGroup[] {
  return [
    {
      key: "overview",
      title: "Overview",
      items: [
        { href: "/", icon: <LayoutDashboard size={17} />, label: "Dashboard" },
      ],
    },
    {
      key: "people",
      title: "People",
      items: [
        { href: "/crew-onboarding", icon: <Users size={17} />, label: "Crew Onboarding" },
        { href: "/passengers", icon: <CreditCard size={17} />, label: "Passengers" },
        { href: "/crew", icon: <Users size={17} />, label: "Crew & Drivers" },
        { href: "/users", icon: <Users size={17} />, label: "Staff & Users" },
      ],
    },
    {
      key: "transit",
      title: "Transit",
      items: [
        { href: "/transactions", icon: <BarChart3 size={17} />, label: "Transactions" },
        { href: "/vehicles", icon: <QrCode size={17} />, label: "Vehicles & QR" },
        { href: "/failed-taps", icon: <AlertTriangle size={17} />, label: "Failed Taps" },
      ],
    },
    {
      key: "money",
      title: "Money",
      items: [
        { href: "/wallet-operations", icon: <Wallet size={17} />, label: "Wallet Ops" },
        { href: "/settlements", icon: <CreditCard size={17} />, label: "Settlements" },
        { href: "/kiosk", icon: <Smartphone size={17} />, label: "Kiosk / Agent" },
      ],
    },
    {
      key: "fleet",
      title: "Fleet (City Bus)",
      items: [
        { href: "/fleet", icon: <Building2 size={17} />, label: "Operators" },
        { href: "/fleet/crew", icon: <Users size={17} />, label: "Fleet Crew" },
        { href: "/fleet/vehicles", icon: <BusFront size={17} />, label: "Vehicles" },
        { href: "/fleet/validators", icon: <QrCode size={17} />, label: "Validators" },
        { href: "/fleet/assignments", icon: <Users size={17} />, label: "Assignments" },
        { href: "/fleet/transactions", icon: <BarChart3 size={17} />, label: "Fleet Txns" },
      ],
    },
    {
      key: "system",
      title: "System",
      items: [
        { href: "/security", icon: <Shield size={17} />, label: "Security Log" },
        { href: "/routes", icon: <MapPin size={17} />, label: "Routes & Fares" },
      ],
    },
  ];
}

function buildEnterpriseNav(): NavGroup[] {
  return [
    {
      key: "fleet",
      title: "Your Fleet",
      items: [
        { href: "/fleet", icon: <Building2 size={17} />, label: "Fleet Overview" },
        { href: "/fleet/crew", icon: <Users size={17} />, label: "Fleet Crew" },
        { href: "/fleet/vehicles", icon: <BusFront size={17} />, label: "Fleet Vehicles" },
        { href: "/fleet/validators", icon: <QrCode size={17} />, label: "Validators" },
        { href: "/fleet/assignments", icon: <Users size={17} />, label: "Assignments" },
        { href: "/fleet/transactions", icon: <BarChart3 size={17} />, label: "Transactions" },
      ],
    },
  ];
}

/* ─── Collapsed state persistence ───────────────────────────────────── */

const STORAGE_KEY = "tapaddis_nav_collapsed";
const BACKEND_ASSET_ORIGIN = process.env.NEXT_PUBLIC_TAPADDIS_BACKEND_ORIGIN;

function resolveAvatarUrl(avatarUrl?: string | null) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

  const normalizedPath = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  const configuredOrigin = BACKEND_ASSET_ORIGIN?.replace(/\/$/, "");
  if (configuredOrigin) {
    return `${configuredOrigin}${normalizedPath}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000${normalizedPath}`;
  }

  return normalizedPath;
}

function loadCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCollapsed(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/* ─── Root component ────────────────────────────────────────────────── */

export function AppChrome({
  children,
  session,
}: {
  children: React.ReactNode;
  session: AdminSession | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const isLoginRoute = pathname === "/login";
  const isEnterpriseAdmin = session?.user.role === "ENTERPRISE_ADMIN";

  const groups = isEnterpriseAdmin ? buildEnterpriseNav() : buildAdminNav();
  const avatarSrc = resolveAvatarUrl(session?.user.avatarUrl);

  /* Collapse state — default: all open */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/session/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/backend/auth/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Failed to upload avatar");
        return;
      }

      await fetch("/api/session/refresh");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Error uploading avatar");
    } finally {
      setUploadingAvatar(false);
      // Reset input
      e.target.value = "";
    }
  };

  /* User initials for avatar */
  const initials = (session?.user.name || "AD")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] lg:hidden"
          onClick={closeMobileNav}
        />
      ) : null}
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[84vw] flex-col border-r border-black/20 bg-[#0B0B0D] text-white shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          mobileNavOpen ? "pointer-events-auto translate-x-0" : "pointer-events-none -translate-x-full lg:pointer-events-auto"
        }`}
      >
        {/* Brand */}
        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-6">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/logo.png" alt="TapAddis Logo" className="h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight">TapAddis</h1>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {isEnterpriseAdmin ? "Enterprise Console" : "Control Panel"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMobileNav}
            className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((group) => (
            <SidebarGroup
              key={group.key}
              group={group}
              pathname={pathname}
              isCollapsed={!!collapsed[group.key]}
              onToggle={() => toggleGroup(group.key)}
              onNavigate={closeMobileNav}
            />
          ))}
        </nav>

        {/* Footer: user info + sign out */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <label
              className={`relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-all ${
                uploadingAvatar ? "opacity-50" : "hover:ring-2 hover:ring-white/50"
              } ${!avatarSrc ? "bg-gradient-to-br from-blue-500 to-blue-700 text-[11px] font-bold text-white" : "bg-slate-800"}`}
              title="Change Profile Picture"
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <Camera size={14} className="text-white" />
              </div>
            </label>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">
                {session?.user.name || "Admin User"}
              </p>
              <p className="truncate text-[11px] text-slate-500">{session?.user.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 lg:hidden"
          >
            <Menu size={18} />
          </button>
          <h2 className="min-w-0 truncate text-sm font-semibold text-slate-900">
            {isEnterpriseAdmin ? "Enterprise Fleet Console" : "Control Panel"}
          </h2>
          <div className="ml-auto flex shrink-0 items-center gap-4">
            <span className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-[11px] font-semibold text-green-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              {isEnterpriseAdmin ? "ENTERPRISE" : "ADMIN"}
            </span>
          </div>
        </header>
        <div className="min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

/* ─── Sidebar group (collapsible section) ────────────────────────────── */

function SidebarGroup({
  group,
  pathname,
  isCollapsed,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  /* Auto-expand when a child link is active */
  const hasActiveChild = group.items.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
  );

  const isOpen = hasActiveChild || !isCollapsed;

  return (
    <div className="mb-1">
      {/* Section header */}
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-2 rounded-md px-2 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 transition hover:text-slate-300"
      >
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown
          size={12}
          className={`text-slate-600 transition-transform duration-200 group-hover:text-slate-400 ${
            isOpen ? "" : "-rotate-90"
          }`}
        />
      </button>

      {/* Items */}
      <div
        className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {group.items.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            pathname={pathname}
            badge={item.badge}
            badgeColor={item.badgeColor}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Single nav item ────────────────────────────────────────────────── */

function NavItem({
  href,
  icon,
  label,
  pathname,
  badge,
  badgeColor = "red",
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  pathname: string;
  badge?: number | null;
  badgeColor?: "red" | "amber" | "blue";
  onNavigate?: () => void;
}) {
  const selected = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const badgeBg = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
  }[badgeColor];

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
        selected
          ? "bg-white/10 text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <span className={selected ? "text-white" : "text-slate-500"}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span
          className={`${badgeBg} ml-auto min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
