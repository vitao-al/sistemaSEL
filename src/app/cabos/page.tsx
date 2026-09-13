'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Plus, Users, Trash2, Edit2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button, ConfirmDialog, EmptyState, Modal, ToastProvider, useToast } from '@/components/ui';
import { CaboEleitoral } from '@/types';
import { createCabo, deleteCabo, getCabos, updateCabo } from '@/lib/data';
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
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
});

type CaboForm = z.infer<typeof formSchema>;
const PER_PAGE = 9;

function CabosContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [cabos, setCabos] = useState<CaboEleitoral[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState<CaboEleitoral | null>(null);
  const [deleteItem, setDeleteItem] = useState<CaboEleitoral | null>(null);
  const form = useForm<CaboForm>({ resolver: zodResolver(formSchema) });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCabos({ search, page, perPage: PER_PAGE });
      setCabos(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useRefetchOnSyncInvalidate(load, [SYNC_KEYS.cabos]);

  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setEditItem(null);
    form.reset({ nome: '', titulo: '', zona: '', email: '', telefone: '', senha: '' });
    setOpenForm(true);
  };

  const openEdit = (item: CaboEleitoral) => {
    setEditItem(item);
    form.reset({ nome: item.nome, titulo: item.titulo, zona: item.zona, email: item.email, telefone: item.telefone ?? '', senha: '' });
    setOpenForm(true);
  };

  const onSubmit = form.handleSubmit(async data => {
    setSaving(true);
    try {
      if (editItem) {
        await updateCabo(editItem.id, data);
        toast('Cabo eleitoral atualizado.', 'success');
      } else {
        await createCabo(data);
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

  const onDelete = async () => {
    if (!deleteItem) return;
    try {
      await deleteCabo(deleteItem.id);
      toast('Cabo eleitoral removido.', 'info');
      setDeleteItem(null);
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
          <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
            Novo Cabo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={s.loading}>Carregando cabos eleitorais...</div>
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
          <label className={s.label}>Senha</label>
          <input className={s.input} type="password" {...form.register('senha')} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        title="Remover cabo eleitoral"
        description={`Tem certeza que deseja remover "${deleteItem?.nome ?? ''}"?`}
        onCancel={() => setDeleteItem(null)}
        onConfirm={onDelete}
      />

    </div>
  );
}

export default function CabosPage() {
  return (
    <ToastProvider>
      <Layout title="Cabos Eleitorais" breadcrumb="Gestão de cabos e acesso à base">
        <CabosContent />
      </Layout>
    </ToastProvider>
  );
}
