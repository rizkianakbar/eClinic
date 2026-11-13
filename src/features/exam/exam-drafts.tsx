'use client';

import { createContext, type ReactNode, use, useCallback, useMemo, useRef, useState } from 'react';

/** Something typed on the exam page but not yet saved, e.g. a medicine filled in without pressing "Tambah". */
export type ExamDraft = {
  /** Shown to the doctor, e.g. the medicine name. */
  label: string;
  /** Saves it. Resolves false when it is incomplete (the form then shows what is missing). */
  commit: () => Promise<boolean>;
};

type ExamDrafts = {
  /** Labels of the drafts waiting to be saved. */
  pending: string[];
  register: (key: string, draft: ExamDraft | null) => void;
  /** Saves every draft in turn; false at the first one that cannot be saved. */
  commitAll: () => Promise<boolean>;
};

const NONE: ExamDrafts = { pending: [], register: () => {}, commitAll: async () => true };

const ExamDraftsContext = createContext<ExamDrafts>(NONE);

type ExamDraftsProviderProps = {
  children: ReactNode;
};

/**
 * Lets the sections of the exam page hand their unsaved input to the finish bar, so signing saves what the
 * doctor typed instead of silently leaving it out.
 */
export function ExamDraftsProvider(props: ExamDraftsProviderProps) {
  const drafts = useRef(new Map<string, ExamDraft>());
  const [pending, setPending] = useState<string[]>([]);

  const register = useCallback((key: string, draft: ExamDraft | null) => {
    if (draft) drafts.current.set(key, draft);
    else drafts.current.delete(key);

    setPending([...drafts.current.values()].map((item) => item.label));
  }, []);

  const commitAll = useCallback(async () => {
    for (const draft of [...drafts.current.values()]) {
      if (!(await draft.commit())) return false;
    }

    return true;
  }, []);

  const value = useMemo(() => ({ pending, register, commitAll }), [pending, register, commitAll]);

  return <ExamDraftsContext value={value}>{props.children}</ExamDraftsContext>;
}

export function useExamDrafts() {
  return use(ExamDraftsContext);
}
