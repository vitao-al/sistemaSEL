// Módulo de email: configuração do transporter e templates HTML.
// Usa nodemailer com SMTP configurável via variáveis de ambiente.
// Em desenvolvimento (sem SMTP configurado), imprime o link no console.

import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const EXPIRY_MINUTES = 30;

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Fallback: simula envio e apenas loga no terminal (útil em desenvolvimento).
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

function buildResetEmailHtml(nome: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Redefinir Senha — Sistema SEL</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #1E293B; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
    .header { background: linear-gradient(135deg, #F97316 0%, #E70030 100%); padding: 36px 40px; text-align: center; }
    .header-logo { display: inline-flex; align-items: center; gap: 10px; }
    .header-icon { width: 44px; height: 44px; background: rgba(255,255,255,0.2); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px; }
    .header-title { color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header-sub { color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; }
    .body { padding: 40px; }
    .greeting { font-size: 20px; font-weight: 700; color: #F8FAFC; margin-bottom: 12px; }
    .text { font-size: 15px; color: #94A3B8; line-height: 1.6; margin-bottom: 20px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white !important; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 8px 24px rgba(249,115,22,0.35); }
    .expiry-box { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); border-radius: 10px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 10px; margin-bottom: 26px; }
    .expiry-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .expiry-text { font-size: 13px; color: #FCD34D; line-height: 1.5; }
    .expiry-text strong { font-weight: 700; }
    .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 28px 0; }
    .url-fallback { font-size: 12px; color: #64748B; word-break: break-all; line-height: 1.5; }
    .url-fallback a { color: #F97316; text-decoration: none; }
    .footer { background: #0F172A; padding: 20px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #475569; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">
        <div class="header-icon">🗳️</div>
        <div>
          <div class="header-title">Sistema SEL</div>
          <div class="header-sub">Gestão de Campanha Eleitoral</div>
        </div>
      </div>
    </div>

    <div class="body">
      <div class="greeting">Olá, ${nome}! 👋</div>

      <p class="text">
        Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color:#F8FAFC">Sistema SEL</strong>.
        Clique no botão abaixo para criar uma nova senha:
      </p>

      <div class="btn-wrap">
        <a href="${resetUrl}" class="btn">🔑 Redefinir minha senha</a>
      </div>

      <div class="expiry-box">
        <div class="expiry-icon">⏱️</div>
        <div class="expiry-text">
          <strong>Atenção:</strong> este link é válido por apenas <strong>${EXPIRY_MINUTES} minutos</strong>.
          Após esse prazo, você precisará solicitar um novo link de recuperação.
        </div>
      </div>

      <p class="text">
        Se você <strong style="color:#F8FAFC">não solicitou</strong> a redefinição de senha, pode ignorar este email
        com segurança. Nenhuma alteração será feita na sua conta.
      </p>

      <hr class="divider" />

      <p class="url-fallback">
        Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br />
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
    </div>

    <div class="footer">
      <p>
        Este email foi enviado automaticamente pelo Sistema SEL.<br />
        Não responda este email — ele não é monitorado.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export interface SendResetEmailInput {
  to: string;
  nome: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({ to, nome, resetUrl }: SendResetEmailInput): Promise<void> {
  const html = buildResetEmailHtml(nome, resetUrl);
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.SMTP_FROM ?? 'Sistema SEL <onboarding@resend.dev>';

  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from,
      to,
      subject: '🔑 Redefinição de senha — Sistema SEL',
      html,
    });

    if (result.error) {
      throw new Error(`[resend] ${result.error.message}`);
    }

    if (!result.data?.id) {
      throw new Error('[resend] envio sem ID de confirmação.');
    }

    console.log(`[email] Recuperação enviada via Resend para ${to} (id: ${result.data.id})`);
    return;
  }

  const transporter = buildTransporter();

  if (!transporter) {
    // Modo desenvolvimento: exibe o link no console para facilitar testes.
    console.log('\n📧 [Email de recuperação — modo desenvolvimento]');
    console.log(`   Para: ${to}`);
    console.log(`   Link: ${resetUrl}`);
    console.log('   (Configure RESEND_API_KEY ou SMTP_HOST/SMTP_USER/SMTP_PASS no .env para envio real)\n');
    return;
  }

  await transporter.sendMail({
    from,
    to,
    subject: '🔑 Redefinição de senha — Sistema SEL',
    html,
  });
}

export const RESET_TOKEN_EXPIRY_MINUTES = EXPIRY_MINUTES;
