import React, { createContext, useContext, useReducer } from 'react';

export type TxType = 'expense' | 'income' | 'recurring_credit';

export interface Category {
  key: string;
  name: string;
  icon: string; // Feather icon name
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
  catKey?: string;
  amount: number;
  author: string | null;
  date: string;
  note: string;
}

interface AppState {
  balance: number;
  movements: Movement[];
  sources: RecurringSource[];
  categories: Category[];
  style: 'lab' | 'calm';
  notifEnabled: boolean;
  notifHour: number;
  lockPin: boolean;
  bio: boolean;
}

type Action =
  | { type: 'ADD_MOVEMENT'; payload: Movement }
  | { type: 'DELETE_MOVEMENT'; id: string }
  | { type: 'ADD_SOURCE'; payload: RecurringSource }
  | { type: 'UPDATE_SOURCE'; id: string; patch: Partial<RecurringSource> }
  | { type: 'REMOVE_SOURCE'; id: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'SET_STYLE'; style: 'lab' | 'calm' }
  | { type: 'SET_SETTINGS'; patch: Partial<AppState> };

const DEFAULT_CATEGORIES: Category[] = [
  { key: 'super', name: 'Supermercado', icon: 'shopping-cart', color: '#2BA597' },
  { key: 'hogar', name: 'Hogar', icon: 'home', color: '#9B7CF0' },
  { key: 'serv', name: 'Servicios', icon: 'zap', color: '#E0A52E' },
  { key: 'deli', name: 'Delivery', icon: 'truck', color: '#E5604A' },
  { key: 'trans', name: 'Transporte', icon: 'navigation', color: '#9FE870' },
  { key: 'salud', name: 'Salud', icon: 'heart', color: '#C3B0F7' },
  { key: 'ocio', name: 'Ocio', icon: 'tag', color: '#F5D020' },
  { key: 'otros', name: 'Otros', icon: 'credit-card', color: '#8B83A6' },
];

const DEFAULT_SOURCES: RecurringSource[] = [
  { id: 's1', name: 'App del club', amount: 520000, active: true },
  { id: 's2', name: 'Alquiler Belgrano', amount: 310000, active: true },
  { id: 's3', name: 'Alquiler Caballito', amount: 270000, active: true },
];

const DEFAULT_MOVEMENTS: Movement[] = [
  { id: '1', type: 'expense', catKey: 'deli', amount: 18400, author: 'Agus', date: 'Hoy', note: 'Pedidos Ya' },
  { id: '2', type: 'expense', catKey: 'super', amount: 32750, author: 'Agus', date: 'Ayer', note: 'Coto' },
  { id: '3', type: 'expense', catKey: 'trans', amount: 9600, author: 'Juli', date: 'Ayer', note: 'SUBE' },
  { id: '4', type: 'income', amount: 85000, author: 'Agus', date: '2 jun', note: 'Venta usados' },
  { id: '5', type: 'expense', catKey: 'serv', amount: 64200, author: 'Juli', date: '2 jun', note: 'Edenor' },
  { id: '6', type: 'expense', catKey: 'salud', amount: 24300, author: 'Juli', date: '1 jun', note: 'Farmacia' },
  { id: '7', type: 'recurring_credit', amount: 1100000, author: null, date: '1 jun', note: 'Acreditación mensual' },
];

const INITIAL: AppState = {
  balance: 842300,
  movements: DEFAULT_MOVEMENTS,
  sources: DEFAULT_SOURCES,
  categories: DEFAULT_CATEGORIES,
  style: 'lab',
  notifEnabled: true,
  notifHour: 21,
  lockPin: true,
  bio: true,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_MOVEMENT': {
      const delta = action.payload.type === 'expense' ? -action.payload.amount : action.payload.amount;
      return {
        ...state,
        balance: state.balance + delta,
        movements: [action.payload, ...state.movements],
      };
    }
    case 'DELETE_MOVEMENT': {
      const mv = state.movements.find(m => m.id === action.id);
      if (!mv) return state;
      const delta = mv.type === 'expense' ? mv.amount : -mv.amount;
      return {
        ...state,
        balance: state.balance + delta,
        movements: state.movements.filter(m => m.id !== action.id),
      };
    }
    case 'ADD_SOURCE':
      return { ...state, sources: [...state.sources, action.payload] };
    case 'UPDATE_SOURCE':
      return {
        ...state,
        sources: state.sources.map(s => s.id === action.id ? { ...s, ...action.patch } : s),
      };
    case 'REMOVE_SOURCE':
      return { ...state, sources: state.sources.filter(s => s.id !== action.id) };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'SET_STYLE':
      return { ...state, style: action.style };
    case 'SET_SETTINGS':
      return { ...state, ...action.patch };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
