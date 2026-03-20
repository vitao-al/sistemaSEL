'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Vote, UserRound } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { getAdmins, registerCabo } from '@/lib/data';
import { Admin } from '@/types';
import s from './login.module.css';

// Validação mínima do formulário principal de autenticação.
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});

const registerSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
  titulo: z.string().min(1, 'Título obrigatório'),
  zona: z.string().min(1, 'Zona obrigatória'),
  adminId: z.string().min(1, 'Selecione um admin'),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated, hasHydrated } = useAuthStore();
  const [showSenha, setShowSenha] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    // Se o usuário já estiver autenticado, não faz sentido permanecer na tela de login.
    if (!hasHydrated) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    getAdmins().then(setAdmins).catch(() => setAdmins([]));
  }, []);

  const onSubmit = async (data: LoginForm) => {
    // Limpa erro global antes de nova tentativa para evitar mensagem stale.
    setGlobalError('');
    try {
      await login(data.email, data.senha);
      const state = useAuthStore.getState();
      const role = state.user?.role;
      router.push(role === 'admin' ? '/cabos' : '/dashboard');
    } catch (err: any) {
      setGlobalError(err.message || 'Erro ao fazer login.');
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setRegisterLoading(true);
    setGlobalError('');
    try {
      await registerCabo(data);
      setRegisterSuccess(true);
      setIsRegisterMode(false);
      registerForm.reset();
    } catch (err: any) {
      setGlobalError(err.message || 'Falha no cadastro.');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className={s.page}>
      {/* Painel institucional com proposta de valor do produto */}
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
            <h2 className={s.formTitle}>{isRegisterMode ? 'Cadastro de Cabo' : 'Bem-vindo(a)'}</h2>
            <p className={s.formSubtitle}>
              {isRegisterMode ? 'Preencha todos os dados obrigatórios e selecione seu admin' : 'Entre com suas credenciais para acessar o painel'}
            </p>
          </div>

          <div className={s.modeSwitch}>
            <button
              type="button"
              className={`${s.modeButton} ${!isRegisterMode ? s.modeButtonActive : ''}`}
              onClick={() => setIsRegisterMode(false)}
            >
              Login
            </button>
            <button
              type="button"
              className={`${s.modeButton} ${isRegisterMode ? s.modeButtonActive : ''}`}
              onClick={() => setIsRegisterMode(true)}
            >
              Cadastro de Cabo
            </button>
          </div>

          {!isRegisterMode ? (
            <form className={s.form} onSubmit={handleSubmit(onSubmit)}>
              {globalError && (
                <div className={s.globalError}>
                  <AlertCircle size={16} />
                  {globalError}
                </div>
              )}

              {registerSuccess && (
                <div className={s.successMsg} style={{ marginBottom: 12 }}>
                  <div className={s.successIcon}><CheckCircle size={18} /></div>
                  <p className={s.successDesc}>Cadastro realizado com sucesso. Faça seu login.</p>
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
            </form>
          ) : (
            <form className={s.form} onSubmit={registerForm.handleSubmit(onRegister)}>
              {globalError && (
                <div className={s.globalError}>
                  <AlertCircle size={16} />
                  {globalError}
                </div>
              )}

              <div className={s.field}>
                <label className={s.label}>Nome</label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}><UserRound size={16} /></span>
                  <input {...registerForm.register('nome')} className={s.input} placeholder="Nome completo" />
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>Email</label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}><Mail size={16} /></span>
                  <input {...registerForm.register('email')} className={s.input} placeholder="cabo@email.com" />
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>Senha</label>
                <div className={s.inputWrap}>
                  <span className={s.inputIcon}><Lock size={16} /></span>
                  <input {...registerForm.register('senha')} className={s.input} type="password" placeholder="******" />
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>Título</label>
                <input {...registerForm.register('titulo')} className={s.input} placeholder="Título" />
              </div>

              <div className={s.field}>
                <label className={s.label}>Zona</label>
                <input {...registerForm.register('zona')} className={s.input} placeholder="Zona" />
              </div>

              <div className={s.field}>
                <label className={s.label}>Admin responsável</label>
                <select {...registerForm.register('adminId')} className={s.input}>
                  <option value="">Selecione o admin</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.nome} ({admin.email})</option>
                  ))}
                </select>
              </div>

              <button type="submit" className={s.submitBtn} disabled={registerLoading}>
                {registerLoading ? <span className={s.spinner} /> : 'Cadastrar Cabo'}
              </button>
            </form>
          )}
        </div>
      </div>

    </div>
  );
}
