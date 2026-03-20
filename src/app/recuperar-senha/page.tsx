'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Vote, Send } from 'lucide-react';
import { authForgotPassword } from '@/lib/data';
import s from './recuperar-senha.module.css';

const schema = z.object({
  email: z.string().email('Informe um email válido.'),
});

type FormData = z.infer<typeof schema>;

export default function RecuperarSenhaPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [isResending, setIsResending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setStatus('loading');
    setErrorMsg('');
    try {
      await authForgotPassword(data.email);
      setSubmittedEmail(data.email);
      setStatus('sent');
      // Bloqueia reenvio por 60 segundos.
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setStatus('error');
      setErrorMsg('Ocorreu um erro ao processar a solicitação. Tente novamente.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    setErrorMsg('');
    try {
      await authForgotPassword(submittedEmail);
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorMsg('Falha ao reenviar. Tente novamente em instantes.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={s.page}>
      {/* Painel esquerdo decorativo */}
      <div className={s.panel}>
        <div className={s.panelBg} />
        <div className={s.brand}>
          <div className={s.brandIcon}><Vote size={22} color="white" /></div>
          <span className={s.brandName}>Sistema SEL</span>
        </div>
        <div className={s.panelContent}>
          <div className={s.panelTitle}>Recuperação de acesso</div>
          <div className={s.panelSub}>
            Esqueceu sua senha? Sem problema. Informe o email cadastrado e enviaremos um link seguro para você criar uma nova senha.
          </div>
          <div className={s.panelSteps}>
            <div className={s.step}>
              <div className={s.stepNum}>1</div>
              <span>Informe seu email cadastrado</span>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>2</div>
              <span>Verifique sua caixa de entrada</span>
            </div>
            <div className={s.step}>
              <div className={s.stepNum}>3</div>
              <span>Clique no link e crie nova senha</span>
            </div>
          </div>
        </div>
        <div className={s.panelFooter}>Gestão de Campanha Eleitoral</div>
      </div>

      {/* Painel direito — formulário */}
      <div className={s.formSide}>
        <div className={s.formCard}>
          {status !== 'sent' ? (
            <>
              <Link href="/login" className={s.backLink}>
                <ArrowLeft size={16} /> Voltar ao login
              </Link>

              <div className={s.cardHeader}>
                <div className={s.cardIcon}>
                  <Mail size={24} color="var(--brand-primary)" />
                </div>
                <h1 className={s.cardTitle}>Esqueci minha senha</h1>
                <p className={s.cardSub}>
                  Digite seu email abaixo. Se estiver cadastrado, você receberá um link para criar uma nova senha válido por <strong>30 minutos</strong>.
                </p>
              </div>

              {status === 'error' && (
                <div className={s.alert}>
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form className={s.form} onSubmit={handleSubmit(onSubmit)}>
                <div className={s.field}>
                  <label className={s.label}>Email</label>
                  <div className={s.inputWrap}>
                    <Mail size={16} className={s.inputIcon} />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="seu@email.com"
                      className={`${s.input} ${errors.email ? s.inputError : ''}`}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {errors.email && <span className={s.fieldError}>{errors.email.message}</span>}
                </div>

                <button
                  type="submit"
                  className={s.btn}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <><span className={s.spinner} /> Enviando...</>
                  ) : (
                    <><Send size={16} /> Enviar link de recuperação</>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Estado de sucesso */
            <div className={s.successState}>
              <div className={s.successIcon}>
                <CheckCircle2 size={40} color="var(--success)" />
              </div>
              <h2 className={s.successTitle}>Email enviado!</h2>
              <p className={s.successText}>
                Se o endereço <strong>{submittedEmail}</strong> estiver cadastrado no sistema, você receberá um email com o link para redefinir sua senha.
              </p>

              <div className={s.infoBox}>
                <div className={s.infoRow}><span className={s.infoDot} />Verifique também a pasta de <strong>spam</strong></div>
                <div className={s.infoRow}><span className={s.infoDot} />O link expira em <strong>30 minutos</strong></div>
                <div className={s.infoRow}><span className={s.infoDot} />Após expirar, você precisará solicitar novamente</div>
              </div>

              <button
                onClick={handleResend}
                disabled={cooldown > 0 || isResending}
                className={s.resendBtn}
              >
                {isResending ? (
                  <><span className={s.spinner} />Reenviando...</>
                ) : cooldown > 0 ? (
                  `Reenviar em ${cooldown}s`
                ) : (
                  'Não recebi o email — reenviar'
                )}
              </button>

              <Link href="/login" className={s.loginLink}>
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
