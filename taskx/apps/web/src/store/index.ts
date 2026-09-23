import { create } from 'zustand';
import { User, Wallet, Task } from '@taskx/types';

interface AppState {
  user: User | null;
  wallet: Wallet | null;
  token: string | null;
  isAuthenticated: boolean;

  setUser: (user: User) => void;
  setWallet: (wallet: Wallet) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  wallet: null,
  token: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  setWallet: (wallet) => set({ wallet }),

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    set({ token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    set({ user: null, wallet: null, token: null, isAuthenticated: false });
  },
}));

interface TaskState {
  tasks: Task[];
  myTasks: Task[];
  currentTask: Task | null;

  setTasks: (tasks: Task[]) => void;
  setMyTasks: (tasks: Task[]) => void;
  setCurrentTask: (task: Task | null) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  myTasks: [],
  currentTask: null,

  setTasks: (tasks) => set({ tasks }),
  setMyTasks: (tasks) => set({ myTasks: tasks }),
  setCurrentTask: (task) => set({ currentTask: task }),
}));
