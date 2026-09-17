'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Plus, Users, Trash2, Edit2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button, ConfirmDialog, EmptyState, Modal, ToastProvider, useToast } from '@/components/ui';
import { CaboEleitoral, Lider } from '@/types';
import RetryNotice from '@/components/ui/RetryNotice';
import { createCabo, deleteCabo, getCabos, getLideres, updateCabo } from '@/lib/data';
import { SYNC_KEYS } from '@/lib/sync/data-sync';
import { useRefetchOnSyncInvalidate } from '@/lib/sync/use-refetch-on-sync';
import { useAuthStore } from '@/store/auth';
import s from './cabos.module.css';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  titulo: z.string().min(1, 'Título obrigatório'),
  zona: z.string().min(1, 'Zona obrigatória'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  liderId: z.string().optional(),
});

type CaboForm = z.infer<typeof formSchema>;
const PER_PAGE = 9;

function CabosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [cabos, setCabos] = useState<CaboEleitoral[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const liderSelecionado = searchParams.get('liderId');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState<CaboEleitoral | null>(null);
  const [deleteItem, setDeleteItem] = useState<CaboEleitoral | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const form = useForm<CaboForm>({ resolver: zodResolver(formSchema) });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getCabos({ search, liderId: liderSelecionado ?? undefined, page, perPage: PER_PAGE });
      setCabos(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('Erro ao carregar cabos eleitorais.', error);
      setCabos([]);
      setTotal(0);
      setLoadError(error instanceof Error ? error.message : 'Falha ao carregar cabos eleitorais.');
    } finally {
      setLoading(false);
    }
  }, [search, page, liderSelecionado]);

  useEffect(() => { load(); }, [load]);

  useRefetchOnSyncInvalidate(load, [SYNC_KEYS.cabos]);

  useEffect(() => {
    let active = true;

    getLideres({ search: '', page: 1, perPage: 1000 })
      .then(result => {
        if (active) setLideres(result.items);
      })
      .catch(error => {
        console.error('Erro ao carregar lideranças.', error);
        if (active) setLideres([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setEditItem(null);
    form.reset({ nome: '', titulo: '', zona: '', email: '', telefone: '', liderId: liderSelecionado ?? '' });
    setOpenForm(true);
  };

  const openEdit = (item: CaboEleitoral) => {
    setEditItem(item);
    form.reset({
      nome: item.nome,
      titulo: item.titulo,
      zona: item.zona,
      email: item.email,
      telefone: item.telefone ?? '',
      liderId: item.liderId ?? liderSelecionado ?? '',
    });
    setOpenForm(true);
  };

  const getTextColor = (hex?: string) => {
    if (!hex) return '#0f172a';
    const clean = hex.replace('#', '');
    const value = clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean;
    const int = Number.parseInt(value, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.72 ? '#0f172a' : '#f8fafc';
  };

  const onSubmit = form.handleSubmit(async data => {
    setSaving(true);
    try {
      const normalizedLiderId = data.liderId && data.liderId.trim() ? data.liderId : undefined;
      const payload = {
        nome: data.nome,
        titulo: data.titulo,
        zona: data.zona,
        email: data.email,
        telefone: data.telefone,
        liderId: normalizedLiderId ?? liderSelecionado ?? undefined,
      };

      if (editItem) {
        await updateCabo(editItem.id, payload);
        toast('Cabo eleitoral atualizado.', 'success');
      } else {
        await createCabo(payload);
        toast('Cabo eleitoral criado.', 'success');
      }
      setOpenForm(false);
      await load();
    } catch {
      toast('Falha ao salvar cabo eleitoral.', 'error');
    } finally {
      setSaving(false);
    }
  });

  const requiredDeletePhrase = deleteItem ? `Eu quero deletar o cabo eleitoral ${deleteItem.nome}` : '';
  const canConfirmDelete = deleteConfirmation.trim() === requiredDeletePhrase;

  const onDelete = async () => {
    if (!deleteItem || !canConfirmDelete) return;
    try {
      await deleteCabo(deleteItem.id);
      toast('Cabo eleitoral removido.', 'info');
      setDeleteItem(null);
      setDeleteConfirmation('');
      await load();
    } catch {
      toast('Falha ao remover cabo eleitoral.', 'error');
    }
  };

  return (
    <div className={s.page}>
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.search}
            placeholder="Buscar por nome, título, zona ou email"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <div className={s.actions}>
          {liderSelecionado && (
            <Button variant="secondary" onClick={() => router.push('/lideres')}>
              Voltar para lideranças
            </Button>
          )}
          <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
            Novo Cabo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={s.loading}>Carregando cabos eleitorais...</div>
      ) : loadError ? (
        <div style={{ padding: 18 }}>
          <RetryNotice message={loadError} onRetry={load} />
        </div>
      ) : cabos.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Nenhum cabo eleitoral encontrado"
          description="Cadastre um cabo eleitoral para começar o gerenciamento."
          action={<Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>Cadastrar cabo</Button>}
        />
      ) : (
        <>
          <div className={s.grid}>
            {cabos.map(item => (
              <div key={item.id} className={s.card}>
                <button className={s.cardBody} onClick={() => router.push(`/eleitores?caboEleitoralId=${item.id}`)}>
                  <div className={s.cardTitle}>{item.nome}</div>
                  <div className={s.cardMeta}>Título: {item.titulo}</div>
                  <div className={s.cardMeta}>Zona: {item.zona}</div>
                  <div className={s.cardMeta}>{item.email}</div>
                  <div
                    className={s.cardFlag}
                    style={{ backgroundColor: item.liderCor ?? 'rgba(148, 163, 184, 0.2)', color: getTextColor(item.liderCor) }}
                  >
                    {item.liderNome ? `Líder: ${item.liderNome}` : 'Líder: não definido'}
                  </div>
                </button>

                <div className={s.cardActions}>
                  <button className={s.actionBtn} onClick={() => openEdit(item)} title="Editar">
                    <Edit2 size={14} />
                  </button>
                  <button className={`${s.actionBtn} ${s.danger}`} onClick={() => setDeleteItem(item)} title="Remover">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={s.pagination}>
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Anterior</Button>
            <span>Página {page} de {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>Próxima</Button>
          </div>
        </>
      )}

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editItem ? 'Editar Cabo Eleitoral' : 'Novo Cabo Eleitoral'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={onSubmit}>{editItem ? 'Salvar' : 'Cadastrar'}</Button>
          </>
        }
      >
        <div className={s.formGrid}>
          <label className={s.label}>Nome</label>
          <input className={s.input} {...form.register('nome')} />
          <label className={s.label}>Título</label>
          <input className={s.input} {...form.register('titulo')} />
          <label className={s.label}>Zona</label>
          <input className={s.input} {...form.register('zona')} />
          <label className={s.label}>Email</label>
          <input className={s.input} {...form.register('email')} />
          <label className={s.label}>Telefone</label>
          <input className={s.input} {...form.register('telefone')} placeholder="(11) 99999-9999" />
          <label className={s.label}>Líder</label>
          <select className={s.input} {...form.register('liderId')} defaultValue={form.watch('liderId') ?? ''}>
            <option value="">Nenhum líder</option>
            {lideres.map(item => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </div>
      </Modal>

      <Modal
        open={!!deleteItem}
        onClose={() => { setDeleteItem(null); setDeleteConfirmation(''); }}
        title="Remover cabo eleitoral"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDeleteItem(null); setDeleteConfirmation(''); }}>Cancelar</Button>
            <Button variant="danger" onClick={onDelete} disabled={!canConfirmDelete}>Confirmar remoção</Button>
          </>
        }
      >
        <div className={s.deleteConfirm}>
          <p className={s.deleteText}>Tem certeza que deseja remover este cabo eleitoral?</p>
          <p className={s.deleteWarning}>Essa ação é permanente e não pode ser desfeita.</p>
          <div className={s.confirmPhraseBox}>{requiredDeletePhrase}</div>
          <label className={s.label}>Digite exatamente a frase acima para confirmar:</label>
          <input
            className={s.input}
            value={deleteConfirmation}
            onChange={event => setDeleteConfirmation(event.target.value)}
            placeholder={requiredDeletePhrase}
          />
        </div>
      </Modal>

    </div>
  );
}

export default function CabosPage() {
  return (
    <ToastProvider>
      <Layout title="Cabos Eleitorais" breadcrumb="Gestão de cabos por liderança">
        <CabosContent />
      </Layout>
    </ToastProvider>
  );
}
