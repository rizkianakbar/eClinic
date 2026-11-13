import {
  BrushIcon,
  DropletsIcon,
  HomeIcon,
  PenLineIcon,
  ReceiptTextIcon,
  UsersIcon,
  WifiIcon,
  WrenchIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

/** One look per suggested category; anything else falls back to a neutral receipt. */
export const EXPENSE_CATEGORY_STYLE: Record<string, { icon: LucideIcon; tone: string; bar: string }> = {
  Gaji: { icon: UsersIcon, tone: "bg-status-exam-soft text-status-exam", bar: "bg-line-exam" },
  Listrik: { icon: ZapIcon, tone: "bg-status-waiting-soft text-status-waiting", bar: "bg-line-waiting" },
  Air: { icon: DropletsIcon, tone: "bg-[#e3f1f8] text-[#1d6a8f]", bar: "bg-[#2f8cbf]" },
  Sewa: { icon: HomeIcon, tone: "bg-status-pharmacy-soft text-status-pharmacy", bar: "bg-line-pharmacy" },
  Internet: { icon: WifiIcon, tone: "bg-[#e6f0fb] text-[#1f5aa6]", bar: "bg-[#3a7bd5]" },
  ATK: { icon: PenLineIcon, tone: "bg-muted text-foreground", bar: "bg-foreground/50" },
  Kebersihan: { icon: BrushIcon, tone: "bg-status-cashier-soft text-status-cashier", bar: "bg-line-cashier" },
  "Perawatan alat": { icon: WrenchIcon, tone: "bg-[#fde8ef] text-[#a3325c]", bar: "bg-[#d4588a]" },
};

export const EXPENSE_FALLBACK_STYLE = { icon: ReceiptTextIcon, tone: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/60" };

export const expenseStyle = (category: string) => EXPENSE_CATEGORY_STYLE[category] ?? EXPENSE_FALLBACK_STYLE;
