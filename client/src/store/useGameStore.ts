// ============================================================
// ZUSTAND GLOBAL STORE
// Hong Hoang Text RPG — Client State Management
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState {
  token: string | null;
  username: string | null;
  isAdmin: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  nsfw_content?: string;
  timestamp: string;
  follow_up_options?: string[];
}

export interface Character {
  character_id: string;
  name: string;
  realm: string;
  realm_progress: number;
  hp: number;
  mp: number;
  lifespan: number;
  cultivation: number;
  foundation: number;
  luck: number;
  stats: Record<string, number>;
  relations: Record<string, unknown>;
  inventory: unknown[];
  equipment: Record<string, unknown>;
  is_dead: boolean;
  death_reason?: string;
  NSFW_enabled: boolean;
  NSFW_level: number;
  server_id: string;
  slot_index: number;
  dao_path?: string;
  aptitudes: unknown[];
  talents: unknown[];
  golden_finger: { enabled?: boolean };
}

export interface Server {
  server_id: string;
  name: string;
  era_name: string;
  world_time: number;
}

export interface WorldEvent {
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  world_time: number;
}

interface GameStore {
  // Auth
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  logout: () => void;

  // TOS
  tosAccepted: boolean;
  setTosAccepted: (v: boolean) => void;

  // Server & Character
  selectedServer: Server | null;
  setSelectedServer: (s: Server | null) => void;
  activeCharacter: Character | null;
  setActiveCharacter: (c: Character | null) => void;

  // In-game chat
  chatLog: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChatLog: () => void;

  // World events feed
  worldEventFeed: WorldEvent[];
  addWorldEvent: (e: WorldEvent) => void;

  // UI state
  showStatsPanel: boolean;
  setShowStatsPanel: (v: boolean) => void;
  showAdminPanel: boolean;
  setShowAdminPanel: (v: boolean) => void;
  statsTab: string;
  setStatsTab: (tab: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;

  // Notifications (realtime)
  notifications: Array<{ id: string; message: string; type: 'info' | 'danger' | 'gold' }>;
  addNotification: (msg: string, type?: 'info' | 'danger' | 'gold') => void;
  removeNotification: (id: string) => void;

  // Code 161982
  hasCode161982: boolean;
  setHasCode161982: (v: boolean) => void;
}

let notifIdCounter = 0;

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      // Auth
      auth: { token: null, username: null, isAdmin: false },
      setAuth: (auth) => set({ auth }),
      logout: () => set({
        auth: { token: null, username: null, isAdmin: false },
        activeCharacter: null,
        selectedServer: null,
        chatLog: [],
        worldEventFeed: [],
        tosAccepted: false,
      }),

      // TOS
      tosAccepted: false,
      setTosAccepted: (v) => set({ tosAccepted: v }),

      // Server & Character
      selectedServer: null,
      setSelectedServer: (s) => set({ selectedServer: s }),
      activeCharacter: null,
      setActiveCharacter: (c) => set({ activeCharacter: c }),

      // Chat
      chatLog: [],
      addChatMessage: (msg) =>
        set((state) => ({ chatLog: [...state.chatLog.slice(-200), msg] })),
      clearChatLog: () => set({ chatLog: [] }),

      // World events
      worldEventFeed: [],
      addWorldEvent: (e) =>
        set((state) => ({ worldEventFeed: [e, ...state.worldEventFeed].slice(0, 50) })),

      // UI
      showStatsPanel: false,
      setShowStatsPanel: (v) => set({ showStatsPanel: v }),
      showAdminPanel: false,
      setShowAdminPanel: (v) => set({ showAdminPanel: v }),
      statsTab: 'realm',
      setStatsTab: (tab) => set({ statsTab: tab }),
      isLoading: false,
      setIsLoading: (v) => set({ isLoading: v }),

      // Notifications
      notifications: [],
      addNotification: (message, type = 'info') => {
        const id = String(++notifIdCounter);
        set((state) => ({
          notifications: [...state.notifications, { id, message, type }],
        }));
        setTimeout(() => {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        }, 5000);
      },
      removeNotification: (id) =>
        set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),

      // Code
      hasCode161982: false,
      setHasCode161982: (v) => set({ hasCode161982: v }),
    }),
    {
      name: 'hong-hoang-store',
      partialize: (state) => ({
        auth: state.auth,
        tosAccepted: state.tosAccepted,
        hasCode161982: state.hasCode161982,
      }),
    }
  )
);
