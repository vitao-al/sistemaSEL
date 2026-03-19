'use client';

import { useEffect, useState } from 'react';
import styles from './ThemeSwitcher.module.css';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme') as Theme || 'system';
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
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
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
        ☀️
      </button>
      <button
        className={`${styles.themeBtn} ${theme === 'dark' ? styles.active : ''}`}
        onClick={() => handleThemeChange('dark')}
        title="Tema escuro"
        aria-label="Tema escuro"
      >
        🌙
      </button>
      <button
        className={`${styles.themeBtn} ${theme === 'system' ? styles.active : ''}`}
        onClick={() => handleThemeChange('system')}
        title="Automático"
        aria-label="Tema automático"
      >
        ⚙️
      </button>
    </div>
  );
}
