'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown, X, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import s from './ui.module.css';

// Card de KPI usado no dashboard para números resumidos e variação percentual.
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  badge?: number;
  badgeUp?: boolean;
  description?: string;
  onClick?: () => void;
  delay?: number;
}

export function StatCard({ label, value, icon, iconBg, iconColor, badge, badgeUp, description, onClick, delay = 0 }: StatCardProps) {
  return (
    <div className={s.statCard} style={{ animationDelay: `${delay}ms` }} onClick={onClick}>
      <div className={s.statCardHeader}>
        <span className={s.statCardLabel}>{label}</span>
        <div className={s.statCardIcon} style={{ background: iconBg, color: iconColor }}>{icon}</div>
      </div>
      <div className={s.statCardValue}>{value}</div>
      <div className={s.statCardFooter}>
        {badge !== undefined && (
          <span className={`${s.statCardBadge} ${badgeUp ? s.badgeUp : s.badgeDown}`}>
            {badgeUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {badge}%
          </span>
        )}
        {description && <span className={s.statCardDesc}>{description}</span>}
      </div>
      {onClick && <ArrowUpRight size={16} className={s.statCardArrow} />}
    </div>
  );
}

// Container padronizado para blocos de gráfico com título/subtítulo.
interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}

export function ChartCard({ title, subtitle, action, children, delay = 0 }: ChartCardProps) {
  return (
    <div className={s.chartCard} style={{ animationDelay: `${delay}ms` }}>
      <div className={s.chartCardHeader}>
        <div>
          <div className={s.chartCardTitle}>{title}</div>
          {subtitle && <div className={s.chartCardSub}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// Selo de status com variantes semânticas.
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  const variantClass = {
    success: s.badgeSuccess,
    warning: s.badgeWarning,
    danger: s.badgeDanger,
    info: s.badgeInfo,
    neutral: s.badgeNeutral,
  }[variant];
  return <span className={`${s.badge} ${variantClass}`}>{children}</span>;
}

// Botão base reutilizado em formulários, modais e tabelas.
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}
export function Button({ children, variant = 'primary', size = 'md', loading, icon, className, ...props }: ButtonProps) {
  const variantClass = {
    primary: s.btnPrimary, secondary: s.btnSecondary, danger: s.btnDanger, ghost: s.btnGhost,
  }[variant];
  const sizeClass = { sm: s.btnSm, md: s.btnMd, lg: s.btnLg }[size];
  return (
    <button className={`${s.btn} ${variantClass} ${sizeClass} ${className ?? ''}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : icon}
      {children}
    </button>
  );
}

// Input com label, ícone e erro integrados em uma única API.
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}
export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className={s.inputField}>
      {label && <label className={s.inputLabel}>{label}</label>}
      <div className={s.inputWrap}>
        {icon && <span className={s.inputIcon}>{icon}</span>}
        <input
          className={`${s.input} ${icon ? s.withIcon : ''} ${error ? s.hasError : ''} ${className ?? ''}`}
          {...props}
        />
      </div>
      {error && <span className={s.inputError}><AlertCircle size={12} />{error}</span>}
    </div>
  );
}

// Placeholder de carregamento para reduzir layout shift.
export function Skeleton({ width, height, className }: { width?: string | number; height?: string | number; className?: string }) {
  return (
    <div
      className={`${s.skeleton} ${className ?? ''}`}
      style={{ width, height: height ?? 20 }}
    />
  );
}

// Estado vazio padrão para listas sem resultados.
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={s.emptyState}>
      <div className={s.emptyIcon}>{icon}</div>
      <div className={s.emptyTitle}>{title}</div>
      {description && <div className={s.emptyDesc}>{description}</div>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

// Modal genérico com lock de scroll do body enquanto está aberto.
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <span className={s.modalTitle}>{title}</span>
          <button className={s.modalClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

// Dialog de confirmação destrutiva (ex.: remoção de registro).
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}
export function ConfirmDialog({ open, title, description, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className={s.modalOverlay} onClick={onCancel}>
      <div className={s.confirmDialog} onClick={e => e.stopPropagation()}>
        <div className={s.confirmIcon}><Trash2 size={24} /></div>
        <div className={s.confirmTitle}>{title}</div>
        <div className={s.confirmDesc}>{description}</div>
        <div className={s.confirmActions}>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}

// Toast global para feedback não-bloqueante.
type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void; }

const ToastCtx = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = (message: string, type: ToastType = 'info') => {
    // ID temporal simples é suficiente para este volume de eventos de UI.
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className={s.toast}>
        {toasts.map(t => (
          <div key={t.id} className={`${s.toastItem} ${t.type === 'success' ? s.toastSuccess : t.type === 'error' ? s.toastError : s.toastInfo}`}>
            {t.type === 'success' ? <CheckCircle size={16} color="var(--success)" /> : t.type === 'error' ? <AlertCircle size={16} color="var(--danger)" /> : <Info size={16} color="var(--info)" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
