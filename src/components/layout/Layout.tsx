'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCircle, Vote,
  LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import UserAvatar from '@/components/ui/UserAvatar';
import MobileSidebar from '@/components/ui/MobileSidebar';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import s from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumb?: string;
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/eleitores', icon: Users, label: 'Eleitores' },
  { href: '/perfil', icon: UserCircle, label: 'Meu Perfil' },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export default function Layout({ children, title, breadcrumb }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, expiresAt, hasHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Aplicar tema inicial
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system';
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

    // Se token expirou, força logout
    if (user && expiresAt && Date.now() > expiresAt) {
      logout();
      router.replace('/login');
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace('/login');
    }
  }, [hasHydrated, user, expiresAt, isAuthenticated, logout, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!hasHydrated || !user) return null;

  return (
    <div className={s.layout}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={s.mobileOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${s.sidebar} ${sidebarOpen ? s.open : ''}`}>
        <div className={s.sidebarTop}>
          <div className={s.brand}>
            <div className={s.brandIcon}><Vote size={18} /></div>
            <span className={s.brandName}>Sistema SEL</span>
          </div>
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
              <div className={s.userRole}>{user.cargo ?? 'Político'}</div>
            </div>
          </Link>
          <button className={s.logoutBtn} onClick={handleLogout} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={s.main}>
        <header className={s.header}>
          <div className={s.headerLeft}>
            <MobileSidebar />
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
    </div>
  );
}
