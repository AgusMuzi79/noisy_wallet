import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState as RNAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { requestNotifPermissions, scheduleDailyReminder, cancelDailyReminder } from '../lib/notifications';
import { localMonthPrefix } from '../theme';

// ── Types ────────────────────────────────────────────────────────────────────

export type TxType = 'expense' | 'income' | 'recurring_credit';

export interface Category {
  id: string;
  name: string;
  icon: string;  // Feather icon name
  color: string;
}

export interface RecurringSource {
  id: string;
  name: string;
  amount: number;
  active: boolean;
}

export interface Movement {
  id: string;
  type: TxType;
  catId?: string;  // category UUID
  amount: number;
  author: string | null;
  date: string;    // ISO date YYYY-MM-DD
  note: string;
  createdAt: string; // ISO timestamp from DB `created_at` (tie-breaker within a day)
}

// Input shape for addMovement — id and createdAt are assigned by the DB
export type NewMovement = Omit<Movement, 'id' | 'createdAt'>;

// A row ready for display. Recurring credits of the same date collapse into one
// virtual "Ingresos fijos" row; `ids` keeps the original movement ids.
export interface DisplayMovement extends Movement {
  ids: string[];
  grouped: boolean;
  balanceAfter: number; // all-time running balance right after this row
}

interface AppState {
  balance: number;
  initialBalance: number;
  movements: Movement[];
  sources: RecurringSource[];
  categories: Category[];
  style: 'lab' | 'calm';
  notifEnabled: boolean;
  notifHour: number;
  lockPin: boolean;
  bio: boolean;
  user1Name: string;
  user2Name: string;
}

interface AppContextValue {
  state: AppState;
  loading: boolean;
  // Derived (memoized)
  monthIncome: number;       // credited fixed income (or active sources until credited) + extras, current month
  monthExtraIncome: number;  // extra income ('income' type), current month
  monthSpent: number;        // expenses, current month
  runningBalance: Record<string, number>; // movement id -> balance after it (all-time, from initial balance)
  displayMovements: DisplayMovement[];    // newest first, recurring credits grouped per date
  // Actions
  addMovement(mv: NewMovement): Promise<string>; // resolves to the inserted id
  deleteMovement(id: string): Promise<void>;
  addSource(s: Omit<RecurringSource, 'id'>): Promise<void>;
  updateSource(id: string, patch: Partial<Omit<RecurringSource, 'id'>>): Promise<void>;
  removeSource(id: string): Promise<void>;
  addCategory(c: Omit<Category, 'id'>): Promise<string>; // resolves to the inserted id
  updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  setStyle(style: 'lab' | 'calm'): void;
  saveSettings(patch: { notifEnabled?: boolean; notifHour?: number; lockPin?: boolean }): Promise<void>;
  setBio(bio: boolean): void;
  setUserNames(user1: string, user2: string): void;
}

// ── DB row mappers ────────────────────────────────────────────────────────────

function rowToCategory(row: any): Category {
  return { id: row.id, name: row.name, icon: row.icon ?? 'credit-card', color: row.color ?? '#8B83A6' };
}

function rowToMovement(row: any): Movement {
  return {
    id: row.id,
    type: row.type as TxType,
    catId: row.category_id ?? undefined,
    amount: Number(row.amount),
    author: row.author ?? null,
    note: row.note ?? '',
    date: row.date,
    createdAt: row.created_at ?? '',
  };
}

function rowToSource(row: any): RecurringSource {
  return { id: row.id, name: row.name, amount: Number(row.amount), active: row.active };
}

function computeBalance(initial: number, movements: Movement[]): number {
  return movements.reduce(
    (acc, m) => (m.type === 'expense' ? acc - m.amount : acc + m.amount),
    initial,
  );
}

// Chronological order: date, then created_at, then id (stable tie-breaker)
function compareChrono(a: Movement, b: Movement): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Balance after each movement, walking all movements chronologically from the
// initial balance. The last value equals `computeBalance(initial, movements)`.
export function computeRunningBalance(initial: number, movements: Movement[]): Record<string, number> {
  const map: Record<string, number> = {};
  let run = initial;
  for (const m of [...movements].sort(compareChrono)) {
    run += m.type === 'expense' ? -m.amount : m.amount;
    map[m.id] = run;
  }
  return map;
}

export const FIXED_INCOME_LABEL = 'Ingresos fijos';

// Collapses `recurring_credit` movements that share a date into one virtual row,
// preserving the input order (the group sits where its first member appears).
// Works on any subset (e.g. a filtered history list); balances come from the
// all-time `runningBalance` map so they stay consistent across filters.
export function groupRecurringCredits(
  movements: Movement[],
  runningBalance: Record<string, number>,
): DisplayMovement[] {
  const out: DisplayMovement[] = [];
  const groups = new Map<string, { row: DisplayMovement; latest: Movement }>();
  for (const m of movements) {
    const bal = runningBalance[m.id] ?? 0;
    if (m.type !== 'recurring_credit') {
      out.push({ ...m, ids: [m.id], grouped: false, balanceAfter: bal });
      continue;
    }
    const g = groups.get(m.date);
    if (!g) {
      const row: DisplayMovement = {
        ...m, id: `credit-${m.date}`, note: FIXED_INCOME_LABEL, ids: [m.id], grouped: true, balanceAfter: bal,
      };
      groups.set(m.date, { row, latest: m });
      out.push(row);
      continue;
    }
    g.row.ids.push(m.id);
    g.row.amount += m.amount;
    // Balance after the group = balance after its chronologically last member
    if (compareChrono(m, g.latest) > 0) {
      g.latest = m;
      g.row.balanceAfter = bal;
      g.row.createdAt = m.createdAt;
    }
  }
  return out;
}


// ── Constants ─────────────────────────────────────────────────────────────────

const STYLE_KEY = '@billetera:style';
const BIO_KEY = '@billetera:bio';
const USER1_KEY = '@billetera:user1';
const USER2_KEY = '@billetera:user2';

const DEFAULT_STATE: AppState = {
  balance: 0,
  initialBalance: 0,
  movements: [],
  sources: [],
  categories: [],
  style: 'lab',
  notifEnabled: true,
  notifHour: 21,
  lockPin: false,
  bio: false,
  user1Name: '',
  user2Name: '',
};

// ── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const initialBalanceRef = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Refetch helpers ──────────────────────────────────────────────────────────

  const refetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (!data) return;
    const movements = data.map(rowToMovement);
    setState(s => ({ ...s, movements, balance: computeBalance(initialBalanceRef.current, movements) }));
  }, []);

  const refetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('created_at');
    if (data) setState(s => ({ ...s, categories: data.map(rowToCategory) }));
  }, []);

  const refetchSources = useCallback(async () => {
    const { data } = await supabase.from('recurring_sources').select('*').order('created_at');
    if (data) setState(s => ({ ...s, sources: data.map(rowToSource) }));
  }, []);

  const triggerMonthlyCredit = useCallback(async () => {
    if (new Date().getDate() !== 1) return;
    try {
      const { data } = await supabase.functions.invoke('credit-monthly-income');
      if (data?.credited) await refetchTransactions();
    } catch {
      // silent — cron is the primary mechanism
    }
  }, [refetchTransactions]);

  const refetchSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (!data) return;
    const initBal = Number(data.initial_balance);
    initialBalanceRef.current = initBal;
    setState(s => ({
      ...s,
      notifEnabled: data.notification_enabled,
      notifHour: data.notification_hour,
      lockPin: data.lock_enabled,
      initialBalance: initBal,
      balance: computeBalance(initBal, s.movements),
    }));
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [
        { data: cats },
        { data: srcs },
        { data: txs },
        { data: settings },
        storedStyle,
        storedBio,
        storedUser1,
        storedUser2,
      ] = await Promise.all([
        supabase.from('categories').select('*').eq('active', true).order('created_at'),
        supabase.from('recurring_sources').select('*').order('created_at'),
        supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('id', 1).single(),
        AsyncStorage.getItem(STYLE_KEY),
        AsyncStorage.getItem(BIO_KEY),
        AsyncStorage.getItem(USER1_KEY),
        AsyncStorage.getItem(USER2_KEY),
      ]);

      if (!mounted) return;

      const categories = (cats ?? []).map(rowToCategory);
      const movements = (txs ?? []).map(rowToMovement);
      const sources = (srcs ?? []).map(rowToSource);
      const initBal = settings ? Number(settings.initial_balance) : 0;
      initialBalanceRef.current = initBal;

      setState({
        categories,
        movements,
        sources,
        balance: computeBalance(initBal, movements),
        initialBalance: initBal,
        style: (storedStyle as 'lab' | 'calm') ?? 'lab',
        notifEnabled: settings?.notification_enabled ?? true,
        notifHour: settings?.notification_hour ?? 21,
        lockPin: settings?.lock_enabled ?? false,
        bio: storedBio === 'true',
        user1Name: storedUser1 ?? '',
        user2Name: storedUser2 ?? '',
      });
      setLoading(false);
      triggerMonthlyCredit();
    }

    load();
    return () => { mounted = false; };
  }, []);

  // ── Realtime (cross-device sync) ──────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('billetera-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, refetchTransactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, refetchCategories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_sources' }, refetchSources)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, refetchSettings)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetchTransactions, refetchCategories, refetchSources, refetchSettings]);

  // ── Re-fetch on foreground (WebSocket may have dropped in background) ────────

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refetchTransactions();
        refetchSources();
        refetchCategories();
        refetchSettings();
        triggerMonthlyCredit();
      }
    });
    return () => sub.remove();
  }, [refetchTransactions, refetchSources, refetchCategories, refetchSettings, triggerMonthlyCredit]);

  // ── Notification scheduling (runs once after initial load) ───────────────────

  useEffect(() => {
    if (loading) return;
    if (state.notifEnabled) {
      requestNotifPermissions().then(granted => {
        if (granted) scheduleDailyReminder(state.notifHour);
      });
    } else {
      cancelDailyReminder();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const addMovement = useCallback(async (mv: NewMovement): Promise<string> => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: mv.type,
        amount: mv.amount,
        category_id: mv.catId ?? null,
        author: mv.author,
        note: mv.note || null,
        date: mv.date,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await refetchTransactions();
    return data.id as string;
  }, [refetchTransactions]);

  const deleteMovement = useCallback(async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refetchTransactions();
  }, [refetchTransactions]);

  const addSource = useCallback(async (s: Omit<RecurringSource, 'id'>) => {
    const tempId = `temp-${Math.random()}`;
    setState(prev => ({ ...prev, sources: [...prev.sources, { id: tempId, ...s }] }));
    await supabase.from('recurring_sources').insert({ name: s.name, amount: s.amount, active: s.active });
    await refetchSources();
  }, [refetchSources]);

  const updateSource = useCallback(async (id: string, patch: Partial<Omit<RecurringSource, 'id'>>) => {
    await supabase.from('recurring_sources').update(patch).eq('id', id);
    // Realtime syncs it; no immediate refetch to avoid interrupting mid-edit
  }, []);

  const removeSource = useCallback(async (id: string) => {
    await supabase.from('recurring_sources').delete().eq('id', id);
    await refetchSources();
  }, [refetchSources]);

  const addCategory = useCallback(async (c: Omit<Category, 'id'>): Promise<string> => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: c.name, icon: c.icon, color: c.color })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await refetchCategories();
    return data.id as string;
  }, [refetchCategories]);

  const updateCategory = useCallback(async (id: string, patch: Partial<Omit<Category, 'id'>>) => {
    await supabase.from('categories').update(patch).eq('id', id);
    await refetchCategories();
  }, [refetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    await supabase.from('categories').update({ active: false }).eq('id', id);
    await refetchCategories();
  }, [refetchCategories]);

  const setStyle = useCallback((style: 'lab' | 'calm') => {
    setState(s => ({ ...s, style }));
    AsyncStorage.setItem(STYLE_KEY, style);
  }, []);

  const saveSettings = useCallback(async (patch: { notifEnabled?: boolean; notifHour?: number; lockPin?: boolean }) => {
    // Optimistic local update
    setState(s => ({
      ...s,
      ...(patch.notifEnabled !== undefined && { notifEnabled: patch.notifEnabled }),
      ...(patch.notifHour !== undefined && { notifHour: patch.notifHour }),
      ...(patch.lockPin !== undefined && { lockPin: patch.lockPin }),
    }));
    const dbPatch: Record<string, any> = {};
    if (patch.notifEnabled !== undefined) dbPatch.notification_enabled = patch.notifEnabled;
    if (patch.notifHour !== undefined) dbPatch.notification_hour = patch.notifHour;
    if (patch.lockPin !== undefined) dbPatch.lock_enabled = patch.lockPin;
    if (Object.keys(dbPatch).length) {
      await supabase.from('settings').update(dbPatch).eq('id', 1);
    }

    if (patch.notifEnabled !== undefined || patch.notifHour !== undefined) {
      const enabled = patch.notifEnabled !== undefined ? patch.notifEnabled : stateRef.current.notifEnabled;
      const hour = patch.notifHour !== undefined ? patch.notifHour : stateRef.current.notifHour;
      if (enabled) {
        const granted = await requestNotifPermissions();
        if (granted) await scheduleDailyReminder(hour);
      } else {
        await cancelDailyReminder();
      }
    }
  }, []);

  const setBio = useCallback((bio: boolean) => {
    setState(s => ({ ...s, bio }));
    AsyncStorage.setItem(BIO_KEY, String(bio));
  }, []);

  const setUserNames = useCallback((user1: string, user2: string) => {
    setState(s => ({ ...s, user1Name: user1, user2Name: user2 }));
    AsyncStorage.setItem(USER1_KEY, user1);
    AsyncStorage.setItem(USER2_KEY, user2);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const currentMonth = localMonthPrefix();

  const monthTotals = useMemo(() => {
    let credited = 0, extra = 0, spent = 0;
    for (const m of state.movements) {
      if (!m.date.startsWith(currentMonth)) continue;
      if (m.type === 'recurring_credit') credited += m.amount;
      else if (m.type === 'income') extra += m.amount;
      else spent += m.amount;
    }
    // Use what was actually credited this month; source amounts may have changed since.
    // Fall back to active sources until the month's credit lands.
    const fixed = credited > 0
      ? credited
      : state.sources.filter(s => s.active).reduce((a, s) => a + s.amount, 0);
    return { income: fixed + extra, extra, spent };
  }, [state.movements, state.sources, currentMonth]);

  const runningBalance = useMemo(
    () => computeRunningBalance(state.initialBalance, state.movements),
    [state.initialBalance, state.movements],
  );

  const displayMovements = useMemo(
    () => groupRecurringCredits(state.movements, runningBalance),
    [state.movements, runningBalance],
  );

  return (
    <AppContext.Provider value={{
      state, loading,
      monthIncome: monthTotals.income,
      monthExtraIncome: monthTotals.extra,
      monthSpent: monthTotals.spent,
      runningBalance,
      displayMovements,
      addMovement, deleteMovement,
      addSource, updateSource, removeSource,
      addCategory, updateCategory, deleteCategory,
      setStyle,
      saveSettings,
      setBio,
      setUserNames,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
