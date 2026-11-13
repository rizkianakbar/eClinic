import { useTranslations } from 'next-intl';
import { expenseStyle } from './expenses.constants';

/** A stored category in the reader's language when it is one of the suggestions; anything else as typed. */
export function useExpenseCategoryLabel() {
  const t = useTranslations('expenses.category');

  return (category: string) => {
    const { key } = expenseStyle(category);

    return key ? t(key) : category;
  };
}
