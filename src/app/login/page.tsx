'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Vote } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { authForgotPassword } from '@/lib/data';
import s from './login.module.css';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});

const forgotSchema = z.object({
  email: z.string().email('Email inválido'),
});

type LoginForm = z.infer<typeof loginSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, hasHydrated } = useAuthStore();
  const [showSenha, setShowSenha] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const forgotForm = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  useEffect(() => {
    if (!hasHydrated) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    setGlobalError('');
    try {
      await login(data.email, data.senha);
      router.push('/dashboard');
    } catch (err: any) {
      setGlobalError(err.message || 'Erro ao fazer login.');
    }
  };

  const onForgot = async (data: ForgotForm) => {
    setForgotLoading(true);
    try {
      await authForgotPassword(data.email);
      setForgotSuccess(true);
    } catch (err: any) {
      forgotForm.setError('email', { message: err.message });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className={s.page}>
      {/* Left Panel */}
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

      {/* Form Panel */}
      <div className={s.formPanel}>
        <div className={s.formBox}>
          <div className={s.formHeader}>
            <h2 className={s.formTitle}>Bem-vindo(a)</h2>
            <p className={s.formSubtitle}>
              Entre com suas credenciais para acessar o painel
            </p>
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
              <button type="button" className={s.forgotLink} onClick={() => setShowForgot(true)}>
                Esqueci minha senha
              </button>
            </div>

            <button type="submit" className={s.submitBtn} disabled={isLoading}>
              {isLoading ? <span className={s.spinner} /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className={s.modalOverlay} onClick={() => { setShowForgot(false); setForgotSuccess(false); }}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            {forgotSuccess ? (
              <div className={s.successMsg}>
                <div className={s.successIcon}><CheckCircle size={28} /></div>
                <p className={s.successTitle}>Email enviado!</p>
                <p className={s.successDesc}>
                  Verifique sua caixa de entrada para redefinir a senha.
                </p>
                <button
                  className={s.submitBtn}
                  style={{ marginTop: '24px', width: '100%' }}
                  onClick={() => { setShowForgot(false); setForgotSuccess(false); }}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <p className={s.modalTitle}>Recuperar senha</p>
                <p className={s.modalDesc}>
                  Informe seu email e enviaremos instruções para redefinir sua senha.
                </p>
                <form onSubmit={forgotForm.handleSubmit(onForgot)}>
                  <div className={s.field}>
                    <label className={s.label}>Email</label>
                    <div className={s.inputWrap}>
                      <span className={s.inputIcon}><Mail size={16} /></span>
                      <input
                        {...forgotForm.register('email')}
                        className={`${s.input} ${forgotForm.formState.errors.email ? s.error : ''}`}
                        type="email"
                        placeholder="seu@email.com"
                      />
                    </div>
                    {forgotForm.formState.errors.email && (
                      <span className={s.fieldError}>
                        <AlertCircle size={12} />
                        {forgotForm.formState.errors.email.message}
                      </span>
                    )}
                  </div>
                  <div className={s.modalActions}>
                    <button type="button" className={s.btnOutline} onClick={() => setShowForgot(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className={s.submitBtn} style={{ flex: 1 }} disabled={forgotLoading}>
                      {forgotLoading ? <span className={s.spinner} /> : 'Enviar'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
