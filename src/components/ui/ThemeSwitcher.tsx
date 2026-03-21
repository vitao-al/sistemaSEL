'use client';

// Controle de tema local (claro, escuro e automático), persistido em cookie apenas se o usuário aceitar cookies de preferência.

import { useEffect, useState } from 'react';
import styles from './ThemeSwitcher.module.css';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  CONSENT_COOKIE_NAME,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  ThemePreference,
  deleteBrowserCookie,
  parseConsentCookie,
  readBrowserCookie,
  writeBrowserCookie,
} from '@/lib/cookies';

type Theme = ThemePreference;

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Recupera preferência salva em cookie e sincroniza com o atributo data-theme do documento.
    const saved = (readBrowserCookie(THEME_COOKIE_NAME) as Theme | null) ?? 'system';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', newTheme);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    // Atualiza UI e só persiste em cookie se o usuário aceitou cookies de preferência.
    setTheme(newTheme);
    const consent = parseConsentCookie(readBrowserCookie(CONSENT_COOKIE_NAME));
    if (consent?.preferences) {
      writeBrowserCookie(THEME_COOKIE_NAME, newTheme, THEME_COOKIE_MAX_AGE_SECONDS);
    } else {
      deleteBrowserCookie(THEME_COOKIE_NAME);
    }
    applyTheme(newTheme);
  };

  if (!mounted) return null;

  return (
    <div className={styles.themeSwitcher}>
      <button
        className={`${styles.themeBtn} ${theme === 'light' ? styles.active : ''}`}
        onClick={() => handleThemeChange('light')}
        title="Tema claro"
        aria-label="Tema claro"
      >
        <Sun size={15} />
      </button>
      <button
        className={`${styles.themeBtn} ${theme === 'dark' ? styles.active : ''}`}
        onClick={() => handleThemeChange('dark')}
        title="Tema escuro"
        aria-label="Tema escuro"
      >
        <Moon size={15} />
      </button>
      <button
        className={`${styles.themeBtn} ${theme === 'system' ? styles.active : ''}`}
        onClick={() => handleThemeChange('system')}
        title="Automático"
        aria-label="Tema automático"
      >
        <Monitor size={15} />
      </button>
    </div>
  );
}
