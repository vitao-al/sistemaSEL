'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, User, Mail, Briefcase, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/layout/Layout';
import { Button, ToastProvider, useToast } from '@/components/ui';
import UserAvatar from '@/components/ui/UserAvatar';
import { useAuthStore } from '@/store/auth';
import { updateUserProfile, updateUserSenha } from '@/lib/data';
import s from './perfil.module.css';

// Utilitário para fallback de avatar textual.
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// Formulário de dados cadastrais editáveis do usuário.
const profileSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  cargo: z.string().optional(),
});

// Formulário de troca de senha com validação de confirmação.
const senhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Campo obrigatório'),
  novaSenha: z.string().min(6, 'Mínimo de 6 caracteres'),
  confirmarSenha: z.string().min(1, 'Campo obrigatório'),
}).refine(d => d.novaSenha === d.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type SenhaForm = z.infer<typeof senhaSchema>;

function PerfilContent() {
  const { toast } = useToast();
  const { user, updateUser } = useAuthStore();
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [senhaMsg, setSenhaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [senhaLoading, setSenhaLoading] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nome: user?.nome ?? '', cargo: user?.cargo ?? '' },
  });

  const senhaForm = useForm<SenhaForm>({ resolver: zodResolver(senhaSchema) });

  const onSaveProfile = async (data: ProfileForm) => {
    if (!user) return;
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const updated = await updateUserProfile(user.id, data);
      // Mantém o store local sincronizado com a versão persistida no backend.
      updateUser(updated);
      setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      toast('Perfil salvo!', 'success');
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Erro ao atualizar perfil.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const onSaveSenha = async (data: SenhaForm) => {
    if (!user) return;
    setSenhaLoading(true);
    setSenhaMsg(null);
    try {
      await updateUserSenha(user.id, data.senhaAtual, data.novaSenha);
      setSenhaMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      // Evita manter valores sensíveis no formulário após atualização.
      senhaForm.reset();
      toast('Senha alterada!', 'success');
    } catch (err: any) {
      setSenhaMsg({ type: 'error', text: err.message || 'Erro ao alterar senha.' });
    } finally {
      setSenhaLoading(false);
    }
  };

  if (!user) return null;

  // Garante que o caminho do avatar seja relativo à pasta public, como /meu-avatar.png
  const avatarPath = user.avatar
    ? user.avatar.startsWith('/')
      ? user.avatar
      : `/${user.avatar}`
    : null;

  return (
    <div className={s.page}>
      {/* Cartão lateral com resumo do perfil */}
      <div className={s.profileCard}>
        <div className={s.profileBanner}>
          <div className={s.profileBannerDecor} />
        </div>
        <div className={s.profileAvatarWrap}>
          <div className={s.profileAvatar}>
          <UserAvatar name={user.nome} src={avatarPath ?? undefined} size={64} />
        </div>
          <div className={s.profileName}>{user.nome}</div>
          {user.cargo && <div className={s.profileCargo}>{user.cargo}</div>}
          <div className={s.profileEmail}>{user.email}</div>
          <div className={s.profileDivider} />
          <div className={s.profileMeta}>
            <div className={s.metaRow}>
              <span className={s.metaIcon}><User size={14} /></span>
              <span>Usuário do sistema</span>
            </div>
            <div className={s.metaRow}>
              <span className={s.metaIcon}><Mail size={14} /></span>
              <span style={{ wordBreak: 'break-all' }}>{user.email}</span>
            </div>
            {user.cargo && (
              <div className={s.metaRow}>
                <span className={s.metaIcon}><Briefcase size={14} /></span>
                <span>{user.cargo}</span>
              </div>
            )}
            <div className={s.metaRow}>
              <span className={s.metaIcon}><Calendar size={14} /></span>
              <span>
                Desde {format(new Date(user.createdAt), "MMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal com formulários de perfil e senha */}
      <div className={s.content}>
        {/* Formulário de dados pessoais */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitle}>Informações pessoais</div>
            <div className={s.sectionDesc}>Atualize seus dados cadastrais</div>
          </div>
          <div className={s.sectionBody}>
            {profileMsg && (
              <div className={`${s.alertBanner} ${profileMsg.type === 'success' ? s.alertSuccess : s.alertError}`}>
                {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {profileMsg.text}
              </div>
            )}
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)}>
              <div className={s.formGrid}>
                <div className={`${s.formField} ${s.formFull}`}>
                  <label className={s.formLabel}>Nome completo</label>
                  <input
                    {...profileForm.register('nome')}
                    className={`${s.formInput} ${profileForm.formState.errors.nome ? s.hasError : ''}`}
                    placeholder="Seu nome completo"
                  />
                  {profileForm.formState.errors.nome && (
                    <span className={s.fieldError}>
                      <AlertCircle size={12} />{profileForm.formState.errors.nome.message}
                    </span>
                  )}
                </div>
                <div className={`${s.formField} ${s.formFull}`}>
                  <label className={s.formLabel}>Email</label>
                  <input
                    className={s.formInput}
                    value={user.email}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>
                <div className={`${s.formField} ${s.formFull}`}>
                  <label className={s.formLabel}>Cargo / Função</label>
                  <input
                    {...profileForm.register('cargo')}
                    className={s.formInput}
                    placeholder="Ex: Vereador, Deputado Estadual…"
                  />
                </div>
              </div>
              <div className={s.formActions}>
                <Button type="submit" variant="primary" loading={profileLoading}>
                  Salvar informações
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Formulário de alteração de senha */}
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <div className={s.sectionTitle}>Alterar senha</div>
            <div className={s.sectionDesc}>Use uma senha forte com ao menos 6 caracteres</div>
          </div>
          <div className={s.sectionBody}>
            {senhaMsg && (
              <div className={`${s.alertBanner} ${senhaMsg.type === 'success' ? s.alertSuccess : s.alertError}`}>
                {senhaMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {senhaMsg.text}
              </div>
            )}
            <form onSubmit={senhaForm.handleSubmit(onSaveSenha)}>
              <div className={s.formGrid}>
                <div className={`${s.formField} ${s.formFull}`}>
                  <label className={s.formLabel}>Senha atual</label>
                  <div className={s.inputWrap}>
                    <input
                      {...senhaForm.register('senhaAtual')}
                      type={showSenhaAtual ? 'text' : 'password'}
                      className={`${s.formInput} ${senhaForm.formState.errors.senhaAtual ? s.hasError : ''}`}
                      style={{ paddingRight: 40, width: '100%' }}
                      placeholder="••••••••"
                    />
                    <button type="button" className={s.inputEye} onClick={() => setShowSenhaAtual(v => !v)}>
                      {showSenhaAtual ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {senhaForm.formState.errors.senhaAtual && (
                    <span className={s.fieldError}>
                      <AlertCircle size={12} />{senhaForm.formState.errors.senhaAtual.message}
                    </span>
                  )}
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Nova senha</label>
                  <div className={s.inputWrap}>
                    <input
                      {...senhaForm.register('novaSenha')}
                      type={showNova ? 'text' : 'password'}
                      className={`${s.formInput} ${senhaForm.formState.errors.novaSenha ? s.hasError : ''}`}
                      style={{ paddingRight: 40, width: '100%' }}
                      placeholder="••••••••"
                    />
                    <button type="button" className={s.inputEye} onClick={() => setShowNova(v => !v)}>
                      {showNova ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {senhaForm.formState.errors.novaSenha && (
                    <span className={s.fieldError}>
                      <AlertCircle size={12} />{senhaForm.formState.errors.novaSenha.message}
                    </span>
                  )}
                </div>
                <div className={s.formField}>
                  <label className={s.formLabel}>Confirmar nova senha</label>
                  <div className={s.inputWrap}>
                    <input
                      {...senhaForm.register('confirmarSenha')}
                      type={showConfirm ? 'text' : 'password'}
                      className={`${s.formInput} ${senhaForm.formState.errors.confirmarSenha ? s.hasError : ''}`}
                      style={{ paddingRight: 40, width: '100%' }}
                      placeholder="••••••••"
                    />
                    <button type="button" className={s.inputEye} onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {senhaForm.formState.errors.confirmarSenha && (
                    <span className={s.fieldError}>
                      <AlertCircle size={12} />{senhaForm.formState.errors.confirmarSenha.message}
                    </span>
                  )}
                </div>
              </div>
              <div className={s.formActions}>
                <Button type="submit" variant="primary" loading={senhaLoading}>
                  Alterar senha
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  // Provider local de toast para esta rota (mantém escopo de feedback da página).
  return (
    <ToastProvider>
      <Layout title="Meu Perfil" breadcrumb="Gerencie suas informações">
        <PerfilContent />
      </Layout>
    </ToastProvider>
  );
}
