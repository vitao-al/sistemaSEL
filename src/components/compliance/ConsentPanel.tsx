'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '@/components/ui';
import { authAcceptCompliance } from '@/lib/data';
import {
  CONSENT_COOKIE_NAME,
  THEME_COOKIE_NAME,
  deleteBrowserCookie,
  isConsentCurrent,
  parseConsentCookie,
  readBrowserCookie,
} from '@/lib/cookies';
import { useAuthStore } from '@/store/auth';
import s from './ConsentPanel.module.css';

export default function ConsentPanel() {
  const router = useRouter();
  const { user, hasHydrated, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [preferencesCookies, setPreferencesCookies] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasHydrated || !user) return;

    const consent = parseConsentCookie(readBrowserCookie(CONSENT_COOKIE_NAME));
    setOpen(!isConsentCurrent(consent, user.id));
    setPreferencesCookies(consent?.preferences ?? true);
  }, [hasHydrated, user]);

  const roleLabel = useMemo(() => {
    if (!user) return 'usuário';
    return user.role === 'admin' ? 'Administrador' : 'Cabo Eleitoral';
  }, [user]);

  const handleAccept = async () => {
    setSaving(true);
    try {
      await authAcceptCompliance(preferencesCookies);
      if (!preferencesCookies) {
        deleteBrowserCookie(THEME_COOKIE_NAME);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    logout();
    router.replace('/login');
  };

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="Termos de uso e preferência de cookies"
      footer={(
        <div className={s.footer}>
          <Link href="/termos" className={s.link} target="_blank">
            Ler documento completo
          </Link>
          <div className={s.actions}>
            <Button variant="secondary" onClick={handleExit}>Sair do painel</Button>
            <Button variant="primary" onClick={() => void handleAccept()} loading={saving}>
              Aceitar e continuar
            </Button>
          </div>
        </div>
      )}
    >
      <div className={s.content}>
        <div className={s.intro}>
          <div className={s.title}>Confirmação obrigatória para acesso do {roleLabel}</div>
          <p className={s.text}>
            Este sistema trata dados sensíveis relacionados à gestão de eleitores, zonas, promessas e informações operacionais de campanha.
            Para continuar, você precisa confirmar ciência dos termos de uso, confidencialidade e da política de cookies utilizados no painel.
          </p>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <div>
              <div className={s.cardTitle}>Cookies essenciais — sempre ativos</div>
              <div className={s.cardMeta}>Obrigatórios para segurança, autenticação e continuidade da sessão.</div>
            </div>
            <div className={`${s.switch} ${s.switchActive}`} aria-hidden="true">
              <div className={s.switchHandle} />
            </div>
          </div>

          <ul className={s.bulletList}>
            <li>`sistema_sel_auth`: mantém sua sessão autenticada com JWT em cookie HttpOnly e seguro.</li>
            <li>`sistema_sel_consent`: registra que você aceitou os termos e suas preferências de cookies.</li>
          </ul>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <div>
              <div className={s.cardTitle}>Cookies de preferência</div>
              <div className={s.cardMeta}>Usados apenas para lembrar tema visual e preferências de interface neste navegador.</div>
            </div>
          </div>

          <button
            type="button"
            className={s.switchRow}
            onClick={() => setPreferencesCookies(value => !value)}
            aria-pressed={preferencesCookies}
          >
            <div className={`${s.switch} ${preferencesCookies ? s.switchActive : ''}`} aria-hidden="true">
              <div className={s.switchHandle} />
            </div>
            <span className={s.text}>
              Permitir armazenar o cookie `sistema_sel_theme` para lembrar seu tema visual.
            </span>
          </button>
        </div>

        <div className={s.notice}>
          Ao aceitar, você declara que utilizará a plataforma com responsabilidade, respeitando confidencialidade, integridade dos dados,
          prevenção de acesso indevido e boas práticas compatíveis com a LGPD e com a natureza sensível das informações eleitorais.
        </div>
      </div>
    </Modal>
  );
}
