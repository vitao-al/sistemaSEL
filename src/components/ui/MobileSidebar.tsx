'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import styles from './MobileSidebar.module.css';

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        className={`${styles.hamburger} ${isOpen ? styles.hamburgerHidden : ''}`}
        onClick={toggleMenu}
        aria-label="Menu"
      >
        <span className={styles.line}></span>
        <span className={styles.line}></span>
        <span className={styles.line}></span>
      </button>

      {/* Overlay */}
      {isOpen && <div className={styles.overlay} onClick={closeMenu}></div>}

      {/* Sidebar */}
      <nav className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2>Menu</h2>
          <button className={styles.closeBtn} onClick={closeMenu} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className={styles.sidebarContent}>
          <ul className={styles.navList}>
            <li>
              <Link href="/dashboard" onClick={closeMenu}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/eleitores" onClick={closeMenu}>
                Eleitores
              </Link>
            </li>
            <li>
              <Link href="/perfil" onClick={closeMenu}>
                Perfil
              </Link>
            </li>
          </ul>

          {user && (
            <div className={styles.sidebarFooter}>
              <p className={styles.userName}>{user.nome}</p>
              <button className={styles.logoutBtn} onClick={() => { logout(); closeMenu(); }}>
                Sair
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
