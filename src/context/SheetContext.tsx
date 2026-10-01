import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Global state for the "Anotar" entry sheet and the undo toast. The sheet and
// the toast render once at the root (app/_layout.tsx); any screen opens them
// through `useSheet()`.

export type SheetMode = 'expense' | 'extra';

// Sheet input kept outside the sheet so it survives a detour to
// /add-category ("Nueva" tile) and back.
export interface SheetDraft {
  raw: string;            // typed digits, no leading zeros, max 8
  selCat: string | null;  // category UUID (expense mode)
  author: string;         // '' = default to user1Name
  note: string;
}

export interface UndoToastData {
  key: number;     // changes on every show so the toast re-animates
  movementId: string;
  text: string;
}

export interface LastAdded {
  id: string;
  type: 'expense' | 'income';
}

interface OpenOpts {
  catId?: string;      // preselect this category
  keepDraft?: boolean; // keep amount/note (returning from /add-category)
}

interface SheetContextValue {
  mode: SheetMode | null; // null = closed
  draft: SheetDraft;
  setDraft(patch: Partial<SheetDraft>): void;
  resetDraft(): void;
  openSheet(mode: SheetMode, opts?: OpenOpts): void;
  closeSheet(): void;
  toast: UndoToastData | null;
  showUndo(movementId: string, text: string): void;
  dismissToast(): void;
  lastAdded: LastAdded | null; // newest entry, for the Home row flash
  markAdded(entry: LastAdded | null): void;
}

const TOAST_MS = 5000;
const LAST_ADDED_MS = 3000;

const EMPTY_DRAFT: SheetDraft = { raw: '', selCat: null, author: '', note: '' };

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<SheetMode | null>(null);
  const [draft, setDraftState] = useState<SheetDraft>(EMPTY_DRAFT);
  const [toast, setToast] = useState<UndoToastData | null>(null);
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);

  const setDraft = useCallback((patch: Partial<SheetDraft>) => {
    setDraftState(d => ({ ...d, ...patch }));
  }, []);

  // Clears amount, note and category; the chosen author is kept
  const resetDraft = useCallback(() => {
    setDraftState(d => ({ ...EMPTY_DRAFT, author: d.author }));
  }, []);

  const openSheet = useCallback((next: SheetMode, opts?: OpenOpts) => {
    setDraftState(d => {
      const base = opts?.keepDraft ? d : { ...d, raw: '', note: '' };
      // Expense mode remembers the last category; extra income has none
      const selCat = opts?.catId ?? (next === 'expense' ? base.selCat : null);
      return { ...base, selCat };
    });
    setMode(next);
  }, []);

  const closeSheet = useCallback(() => setMode(null), []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const showUndo = useCallback((movementId: string, text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ key: Date.now(), movementId, text });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const markAdded = useCallback((entry: LastAdded | null) => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
    setLastAdded(entry);
    if (entry) addedTimer.current = setTimeout(() => setLastAdded(null), LAST_ADDED_MS);
  }, []);

  return (
    <SheetContext.Provider value={{
      mode, draft, setDraft, resetDraft, openSheet, closeSheet,
      toast, showUndo, dismissToast,
      lastAdded, markAdded,
    }}>
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet must be used within SheetProvider');
  return ctx;
}
