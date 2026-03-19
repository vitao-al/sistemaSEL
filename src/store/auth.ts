'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState } from '@/types';
import { authLogin } from '@/lib/data';

// Store central de autenticação com persistência no localStorage.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      expiresAt: null,
      hasHydrated: false,

      // Sinaliza quando o estado persistido já foi restaurado no cliente.
      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },

      login: async (email, senha) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authLogin(email, senha);
          const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 dias
          set({ user, token, isAuthenticated: true, isLoading: false, expiresAt });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      // Limpa sessão local (token, usuário e data de expiração).
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, expiresAt: null });
      },

      // Atualização parcial do perfil no store sem perder campos atuais.
      updateUser: (data) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...data } });
      },
    }),
    {
      name: 'voter-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        expiresAt: state.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Segurança extra: descarta sessão persistida se já estiver vencida.
        if (state.expiresAt && Date.now() > state.expiresAt) {
          state.logout();
        }

        state.setHasHydrated(true);
      },
    }
  )
);
