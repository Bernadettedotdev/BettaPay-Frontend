import {
  BarChart3,
  Users,
  ListOrdered,
  Anchor,
  RefreshCcw,
  ShieldAlert,
  Settings,
  Webhook,
  Coins,
  BellRing,
} from "lucide-react";
import type { NavItem } from "./types";
import { ROUTES } from "./routes";

export const adminNavItems: NavItem[] = [
  { href: ROUTES.OVERVIEW, label: "Overview", icon: BarChart3 },
  { href: "/merchants", label: "Merchants", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/anchors", label: "Anchors", icon: Anchor },
  { href: "/fx-management", label: "FX Management", icon: RefreshCcw },
  { href: "/compliance", label: "Compliance", icon: ShieldAlert },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/assets", label: "Assets", icon: Coins },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
