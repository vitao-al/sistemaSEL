'use client';

// Controle de tema local (claro, escuro e automático), persistido no localStorage.

import { useEffect, useState } from 'react';
import styles from './ThemeSwitcher.module.css';
import { Sun } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Recupera preferência salva e sincroniza com o atributo data-theme do documento.
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
    // Atualiza UI, persiste escolha e aplica imediatamente.
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
