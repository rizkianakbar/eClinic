import {
  BrushIcon,
  DropletsIcon,
  HomeIcon,
  type LucideIcon,
  PenLineIcon,
  ReceiptTextIcon,
  UsersIcon,
  WifiIcon,
  WrenchIcon,
  ZapIcon,
} from 'lucide-react';

export type ExpenseCategoryKey =
  | 'salary'
  | 'electricity'
  | 'water'
  | 'rent'
  | 'internet'
  | 'stationery'
  | 'cleaning'
  | 'maintenance'
  | 'other';

type ExpenseStyle = { key: ExpenseCategoryKey | null; icon: LucideIcon; tone: string; bar: string };

/** One look (and message key) per suggested category; anything else falls back to a neutral receipt. */
const EXPENSE_CATEGORY_STYLE: Record<string, ExpenseStyle> = {
  Gaji: { key: 'salary', icon: UsersIcon, tone: 'bg-status-exam-soft text-status-exam', bar: 'bg-line-exam' },
  Listrik: {
    key: 'electricity',
    icon: ZapIcon,
    tone: 'bg-status-waiting-soft text-status-waiting',
    bar: 'bg-line-waiting',
  },
  Air: { key: 'water', icon: DropletsIcon, tone: 'bg-[#e3f1f8] text-[#1d6a8f]', bar: 'bg-[#2f8cbf]' },
  Sewa: { key: 'rent', icon: HomeIcon, tone: 'bg-status-pharmacy-soft text-status-pharmacy', bar: 'bg-line-pharmacy' },
  Internet: { key: 'internet', icon: WifiIcon, tone: 'bg-[#e6f0fb] text-[#1f5aa6]', bar: 'bg-[#3a7bd5]' },
  ATK: { key: 'stationery', icon: PenLineIcon, tone: 'bg-muted text-foreground', bar: 'bg-foreground/50' },
  Kebersihan: {
    key: 'cleaning',
    icon: BrushIcon,
    tone: 'bg-status-cashier-soft text-status-cashier',
    bar: 'bg-line-cashier',
  },
  'Perawatan alat': { key: 'maintenance', icon: WrenchIcon, tone: 'bg-[#fde8ef] text-[#a3325c]', bar: 'bg-[#d4588a]' },
  Lainnya: {
    key: 'other',
    icon: ReceiptTextIcon,
    tone: 'bg-muted text-muted-foreground',
    bar: 'bg-muted-foreground/60',
  },
};

const EXPENSE_FALLBACK_STYLE: ExpenseStyle = {
  key: null,
  icon: ReceiptTextIcon,
  tone: 'bg-muted text-muted-foreground',
  bar: 'bg-muted-foreground/60',
};

export const expenseStyle = (category: string) => EXPENSE_CATEGORY_STYLE[category] ?? EXPENSE_FALLBACK_STYLE;
