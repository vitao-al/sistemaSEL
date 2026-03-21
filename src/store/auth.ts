'use client';

import { create } from 'zustand';
import { AuthState } from '@/types';
import { authGetSession, authLogin, authLogout } from '@/lib/data';

// Store central de autenticação baseada em cookie HttpOnly.
// O frontend mantém apenas o perfil em memória; o token nunca fica exposto ao JavaScript.
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  expiresAt: null,
  hasHydrated: false,

  initialize: async () => {
    if (get().hasHydrated || get().isLoading) return;

    set({ isLoading: true });
    try {
      const { user } = await authGetSession();
      set({ user, isAuthenticated: true, isLoading: false, hasHydrated: true });
    } catch {
      set({ user: null, token: null, isAuthenticated: false, expiresAt: null, isLoading: false, hasHydrated: true });
    }
  },

  setHasHydrated: (value) => {
    set({ hasHydrated: value });
  },

  login: async (email, senha) => {
    set({ isLoading: true });
    try {
      const { user } = await authLogin(email, senha);
      set({ user, token: null, isAuthenticated: true, isLoading: false, hasHydrated: true });
    } catch (err) {
      set({ isLoading: false, hasHydrated: true });
      throw err;
    }
  },

  logout: () => {
    void authLogout();
    set({ user: null, token: null, isAuthenticated: false, expiresAt: null, hasHydrated: true });
  },

  updateUser: (data) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...data } });
  },
}));
