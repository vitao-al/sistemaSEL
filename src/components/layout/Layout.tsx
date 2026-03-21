'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCircle, Vote,
  LogOut, Menu, X
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import UserAvatar from '@/components/ui/UserAvatar';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import ConsentPanel from '@/components/compliance/ConsentPanel';
import { THEME_COOKIE_NAME, readBrowserCookie, ThemePreference } from '@/lib/cookies';
import s from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumb?: string;
}

function getNavItems(role: 'admin' | 'cabo') {
  if (role === 'admin') {
    return [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/cabos', icon: Users, label: 'Cabos Eleitorais' },
      { href: '/perfil', icon: UserCircle, label: 'Meu Perfil' },
    ];
  }

  return [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/eleitores', icon: Users, label: 'Eleitores' },
    { href: '/perfil', icon: UserCircle, label: 'Meu Perfil' },
  ];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function Layout({ children, title, breadcrumb }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, hasHydrated, initialize } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    // Aplica o tema persistido em cookie assim que o shell monta.
    const savedTheme = (readBrowserCookie(THEME_COOKIE_NAME) as ThemePreference | null) ?? 'system';
    const root = document.documentElement;
    
    if (savedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated || !user) {
      router.replace('/login');
    }
  }, [hasHydrated, user, isAuthenticated, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!hasHydrated || !user) return null;

  const navItems = getNavItems(user.role);

  return (
    <div className={s.layout}>
      {/* Overlay de bloqueio quando o menu lateral mobile está aberto */}
      {sidebarOpen && (
        <div className={s.mobileOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Navegação lateral fixa (desktop) / deslizante (mobile) */}
      <aside className={`${s.sidebar} ${sidebarOpen ? s.open : ''}`}>
        <div className={s.sidebarTop}>
          <div className={s.brand}>
            <div className={s.brandIcon}><Vote size={18} /></div>
            <span className={s.brandName}>Sistema SEL</span>
          </div>
          <button className={s.sidebarClose} onClick={() => setSidebarOpen(false)} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className={s.nav}>
          <span className={s.navSection}>Principal</span>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${s.navItem} ${pathname.startsWith(item.href) ? s.active : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className={s.navIcon}><item.icon size={18} /></span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={s.sidebarBottom}>
          <Link href="/perfil" className={s.userCard} onClick={() => setSidebarOpen(false)}>
            <div style={{ width: 34, height: 34 }}>
              <UserAvatar name={user.nome} src={user.avatar ?? undefined} size={34} />
            </div>
            <div className={s.userInfo}>
              <div className={s.userName}>{user.nome}</div>
              <div className={s.userRole}>{user.role === 'admin' ? 'Admin' : 'Cabo Eleitoral'}</div>
            </div>
          </Link>
          <button className={s.logoutBtn} onClick={handleLogout} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Área principal com header contextual e conteúdo da rota */}
      <div className={s.main}>
        <header className={s.header}>
          <div className={s.headerLeft}>
            <button className={s.mobileMenuBtn} onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
              <Menu size={18} />
            </button>
            <div className={s.pageMeta}>
              <span className={s.pageTitle}>{title}</span>
              {breadcrumb && <span className={s.pageBreadcrumb}>{breadcrumb}</span>}
            </div>
          </div>
          <div className={s.headerRight}>
            <ThemeSwitcher />
            <div style={{ width: 36, height: 36 }}>
              <UserAvatar name={user.nome} src={user.avatar ?? undefined} size={36} />
            </div>
          </div>
        </header>

        <main className={s.content}>
          {children}
        </main>
      </div>
      <ConsentPanel />
    </div>
  );
}
