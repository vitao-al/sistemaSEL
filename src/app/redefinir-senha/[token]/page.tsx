'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowLeft, Clock, Vote } from 'lucide-react';
import { authValidateResetToken, authResetPassword } from '@/lib/data';
import s from './redefinir-senha.module.css';

const schema = z
  .object({
    novaSenha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
    confirmar: z.string().min(1, 'Confirme a senha.'),
  })
  .refine(data => data.novaSenha === data.confirmar, {
    message: 'As senhas não coincidem.',
    path: ['confirmar'],
  });

type FormData = z.infer<typeof schema>;

type PageState = 'loading' | 'valid' | 'expired' | 'used' | 'error' | 'success';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RedefinirSenhaPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Valida o token no carregamento da página.
  useEffect(() => {
    if (!token) { setPageState('error'); return; }

    authValidateResetToken(token)
      .then(data => {
        setSecondsLeft(data.secondsLeft);
        setUserEmail(data.email);
        setPageState(data.secondsLeft > 0 ? 'valid' : 'expired');
      })
      .catch(err => {
        const msg: string = err?.message ?? '';
        if (msg.includes('expirou') || msg.includes('410')) setPageState('expired');
        else if (msg.includes('utilizado')) setPageState('used');
        else setPageState('error');
      });
  }, [token]);

  // Countdown timer — atualiza a cada segundo enquanto o token é válido.
  useEffect(() => {
    if (pageState !== 'valid' || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPageState('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pageState, secondsLeft]);

  const onSubmit = useCallback(
    async (data: FormData) => {
      setSubmitError('');
      try {
        await authResetPassword(token, data.novaSenha);
        setPageState('success');
        setTimeout(() => router.push('/login'), 4000);
      } catch (err: any) {
        const msg: string = err?.message ?? 'Erro desconhecido.';
        if (msg.includes('expirou') || msg.includes('410')) {
          setPageState('expired');
        } else {
          setSubmitError(msg || 'Falha ao redefinir senha. Tente novamente.');
        }
      }
    },
    [token, router]
  );

  // ── Estado: carregando ──
  if (pageState === 'loading') {
    return (
      <div className={s.centerPage}>
        <div className={s.spinner} />
        <p className={s.loadingText}>Verificando link...</p>
      </div>
    );
  }

  // ── Estado: link expirado ──
  if (pageState === 'expired') {
    return (
      <div className={s.centerPage}>
        <div className={s.statusCard}>
          <div className={`${s.statusIcon} ${s.statusIconWarning}`}>
            <AlertTriangle size={36} />
          </div>
          <h1 className={s.statusTitle}>Link expirado</h1>
          <p className={s.statusText}>
            Este link de recuperação <strong>expirou</strong> (válido por 30 minutos). Solicite um novo link para continuar.
          </p>
          <Link href="/recuperar-senha" className={s.primaryBtn}>
            Solicitar novo link
          </Link>
          <Link href="/login" className={s.secondaryLink}>
            <ArrowLeft size={14} /> Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  // ── Estado: link já utilizado ──
  if (pageState === 'used') {
    return (
      <div className={s.centerPage}>
        <div className={s.statusCard}>
          <div className={`${s.statusIcon} ${s.statusIconWarning}`}>
            <AlertTriangle size={36} />
          </div>
          <h1 className={s.statusTitle}>Link já utilizado</h1>
          <p className={s.statusText}>
            Este link de recuperação já foi utilizado. Cada link pode ser usado apenas uma vez. Se precisar redefinir sua senha novamente, solicite um novo link.
          </p>
          <Link href="/recuperar-senha" className={s.primaryBtn}>
            Solicitar novo link
          </Link>
          <Link href="/login" className={s.secondaryLink}>
            <ArrowLeft size={14} /> Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  // ── Estado: link inválido / erro genérico ──
  if (pageState === 'error') {
    return (
      <div className={s.centerPage}>
        <div className={s.statusCard}>
          <div className={`${s.statusIcon} ${s.statusIconWarning}`}>
            <AlertTriangle size={36} />
          </div>
          <h1 className={s.statusTitle}>Link inválido</h1>
          <p className={s.statusText}>
            Este link de recuperação é inválido ou não existe. Verifique se o link está completo ou solicite um novo.
          </p>
          <Link href="/recuperar-senha" className={s.primaryBtn}>
            Solicitar novo link
          </Link>
          <Link href="/login" className={s.secondaryLink}>
            <ArrowLeft size={14} /> Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  // ── Estado: senha redefinida com sucesso ──
  if (pageState === 'success') {
    return (
      <div className={s.centerPage}>
        <div className={s.statusCard}>
          <div className={`${s.statusIcon} ${s.statusIconSuccess}`}>
            <CheckCircle2 size={36} />
          </div>
          <h1 className={s.statusTitle}>Senha redefinida!</h1>
          <p className={s.statusText}>
            Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
          </p>
          <Link href="/login" className={s.primaryBtn}>
            Ir para o login agora
          </Link>
        </div>
      </div>
    );
  }

  // ── Estado: válido — formulário de redefinição ──
  return (
    <div className={s.page}>
      {/* Painel esquerdo */}
      <div className={s.panel}>
        <div className={s.panelBg} />
        <div className={s.brand}>
          <div className={s.brandIcon}><Vote size={22} color="white" /></div>
          <span className={s.brandName}>Sistema SEL</span>
        </div>
        <div className={s.panelContent}>
          <div className={s.panelTitle}>Criar nova senha</div>
          <div className={s.panelSub}>
            Escolha uma senha forte para proteger sua conta. Use letras, números e caracteres especiais para maior segurança.
          </div>
          <div className={s.tips}>
            <div className={s.tip}><span className={s.tipDot} />Mínimo de 6 caracteres</div>
            <div className={s.tip}><span className={s.tipDot} />Não use a mesma senha de outros serviços</div>
            <div className={s.tip}><span className={s.tipDot} />Evite dados pessoais como datas de nascimento</div>
          </div>
        </div>
        <div className={s.panelFooter}>Gestão de Campanha Eleitoral</div>
      </div>

      {/* Painel direito — formulário */}
      <div className={s.formSide}>
        <div className={s.formCard}>
          <Link href="/login" className={s.backLink}>
            <ArrowLeft size={16} /> Voltar ao login
          </Link>

          <div className={s.cardHeader}>
            <div className={s.cardIcon}><Lock size={24} color="var(--brand-primary)" /></div>
            <h1 className={s.cardTitle}>Redefinir senha</h1>
            {userEmail && (
              <p className={s.emailBadge}>{userEmail}</p>
            )}
          </div>

          {/* Timer de expiração */}
          <div className={`${s.timerBox} ${secondsLeft <= 120 ? s.timerUrgent : ''}`}>
            <Clock size={15} />
            <span>
              Link expira em <strong>{formatTime(secondsLeft)}</strong>
              {secondsLeft <= 120 && ' — use agora!'}
            </span>
          </div>

          {submitError && (
            <div className={s.alert}>
              <AlertTriangle size={15} />
              <span>{submitError}</span>
            </div>
          )}

          <form className={s.form} onSubmit={handleSubmit(onSubmit)}>
            <div className={s.field}>
              <label className={s.label}>Nova senha</label>
              <div className={s.inputWrap}>
                <Lock size={15} className={s.inputIcon} />
                <input
                  {...register('novaSenha')}
                  type={showSenha ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  className={`${s.input} ${errors.novaSenha ? s.inputError : ''}`}
                  autoFocus
                />
                <button type="button" className={s.eyeBtn} onClick={() => setShowSenha(v => !v)}>
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.novaSenha && <span className={s.fieldError}>{errors.novaSenha.message}</span>}
            </div>

            <div className={s.field}>
              <label className={s.label}>Confirmar senha</label>
              <div className={s.inputWrap}>
                <Lock size={15} className={s.inputIcon} />
                <input
                  {...register('confirmar')}
                  type={showConfirmar ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  className={`${s.input} ${errors.confirmar ? s.inputError : ''}`}
                />
                <button type="button" className={s.eyeBtn} onClick={() => setShowConfirmar(v => !v)}>
                  {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmar && <span className={s.fieldError}>{errors.confirmar.message}</span>}
            </div>

            <button type="submit" className={s.btn} disabled={isSubmitting}>
              {isSubmitting ? (
                <><span className={s.spinner} />Salvando...</>
              ) : (
                <><CheckCircle2 size={16} />Salvar nova senha</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
