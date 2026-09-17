'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Vote } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import s from './login.module.css';

// Validação mínima do formulário principal de autenticação.
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, hasHydrated, initialize } = useAuthStore();
  const [showSenha, setShowSenha] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    // Se o usuário já estiver autenticado via cookie de sessão, não faz sentido permanecer na tela de login.
    if (!hasHydrated) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    // Limpa erro global antes de nova tentativa para evitar mensagem stale.
    setGlobalError('');
    try {
      await login(data.email, data.senha);
      const state = useAuthStore.getState();
      const role = state.user?.role;
      router.push(role === 'admin' ? '/lideres' : '/dashboard');
    } catch (err: any) {
      setGlobalError(err.message || 'Erro ao fazer login.');
    }
  };

  return (
    <div className={s.page}>
      
      <div className={s.panel}>
        <div className={s.panelBg} />
        <div className={s.panelDecor} />
        <div className={s.panelDecor2} />

        <div className={s.brand}>
          <div className={s.brandIcon}>
            <Vote size={20} />
          </div>
          <span className={s.brandName}>Sistema SEL</span>
        </div>

        <div className={s.panelContent}>
          <h1 className={s.panelTitle}>
            Gerencie seus<br />
            eleitores com<br />
            <span>inteligência</span>
          </h1>
          <p className={s.panelDesc}>
            Acompanhe promessas, zonas eleitorais e o crescimento da sua base de apoiadores em tempo real.
          </p>
        </div>

      </div>

      {/* Painel de autenticação */}
      <div className={s.formPanel}>
        <div className={s.formBox}>
          <div className={s.formHeader}>
            <h2 className={s.formTitle}>Bem-vindo(a)</h2>
            <p className={s.formSubtitle}>Entre com suas credenciais para acessar o painel</p>
          </div>

          <form className={s.form} onSubmit={handleSubmit(onSubmit)}>
            {globalError && (
              <div className={s.globalError}>
                <AlertCircle size={16} />
                {globalError}
              </div>
            )}

            <div className={s.field}>
                <label className={s.label}>Email</label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}><Mail size={16} /></span>
                  <input
                    {...register('email')}
                    className={`${s.input} ${errors.email ? s.error : ''}`}
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <span className={s.fieldError}>
                    <AlertCircle size={12} />{errors.email.message}
                  </span>
                )}
              </div>

              <div className={s.field}>
                <label className={s.label}>Senha</label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}><Lock size={16} /></span>
                  <input
                    {...register('senha')}
                    className={`${s.input} ${errors.senha ? s.error : ''}`}
                    type={showSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" className={s.eyeBtn} onClick={() => setShowSenha(v => !v)}>
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.senha && (
                  <span className={s.fieldError}>
                    <AlertCircle size={12} />{errors.senha.message}
                  </span>
                )}
              </div>

              <div className={s.forgot}>
                <Link href="/recuperar-senha" className={s.forgotLink}>
                  Esqueci minha senha
                </Link>
              </div>

              <button type="submit" className={s.submitBtn} disabled={isLoading}>
                {isLoading ? <span className={s.spinner} /> : 'Entrar'}
              </button>

            <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Ao acessar o painel, será exibido um termo obrigatório de uso e cookies essenciais para a segurança da sessão.
              Leia também os <Link href="/termos" style={{ color: 'var(--brand-secondary)', fontWeight: 700 }}>Termos de Uso e Política de Cookies</Link>.
            </p>
          </form>
        </div>
      </div>

    </div>
  );
}
