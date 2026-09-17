'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Plus, Users, Trash2, Edit2 } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button, EmptyState, Modal, ToastProvider, useToast } from '@/components/ui';
import { Lider } from '@/types';
import RetryNotice from '@/components/ui/RetryNotice';
import { createLider, deleteLider, getLideres, updateLider } from '@/lib/data';
import { useAuthStore } from '@/store/auth';
import s from './lideres.module.css';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').default('#3b82f6'),
});

type LiderForm = z.infer<typeof formSchema>;
const PER_PAGE = 9;

function LideresContent() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState<Lider | null>(null);
  const [deleteItem, setDeleteItem] = useState<Lider | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const form = useForm<LiderForm>({ resolver: zodResolver(formSchema) });

  const requiredDeletePhrase = deleteItem ? `Eu quero apagar o líder ${deleteItem.nome}` : '';
  const canConfirmDelete = deleteConfirmation.trim() === requiredDeletePhrase;

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getLideres({ search, page, perPage: PER_PAGE });
      setLideres(result.items);
      setTotal(result.total);
    } catch (error) {
      console.error('Erro ao carregar lideranças.', error);
      setLideres([]);
      setTotal(0);
      setLoadError(error instanceof Error ? error.message : 'Falha ao carregar lideranças.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setEditItem(null);
    form.reset({ nome: '', cor: '#3b82f6' });
    setOpenForm(true);
  };

  const openEdit = (item: Lider) => {
    setEditItem(item);
    form.reset({ nome: item.nome, cor: item.cor ?? '#3b82f6' });
    setOpenForm(true);
  };

  const onSubmit = form.handleSubmit(async data => {
    setSaving(true);
    try {
      if (editItem) {
        await updateLider(editItem.id, data);
        toast('Liderança atualizada.', 'success');
      } else {
        await createLider(data);
        toast('Liderança criada.', 'success');
      }
      setOpenForm(false);
      await load();
    } catch {
      toast('Falha ao salvar liderança.', 'error');
    } finally {
      setSaving(false);
    }
  });

  const onDelete = async () => {
    if (!deleteItem || !canConfirmDelete) return;
    setDeleting(true);
    try {
      await deleteLider(deleteItem.id);
      toast('Liderança removida.', 'info');
      setDeleteItem(null);
      setDeleteConfirmation('');
      await load();
    } catch {
      toast('Falha ao remover liderança.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className={s.page}>
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.search}
            placeholder="Buscar por nome"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <div className={s.actions}>
          <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
            Nova Liderança
          </Button>
        </div>
      </div>

      {loading ? (
        <div className={s.loading}>Carregando lideranças...</div>
      ) : loadError ? (
        <div style={{ padding: 18 }}>
          <RetryNotice message={loadError} onRetry={load} />
        </div>
      ) : lideres.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Nenhuma liderança encontrada"
          description="Cadastre uma liderança para começar a organizar os cabos eleitorais."
          action={<Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>Cadastrar liderança</Button>}
        />
      ) : (
        <>
          <div className={s.grid}>
            {lideres.map(item => (
              <div key={item.id} className={s.card}>
                <div className={s.cardBody}>
                  <div className={s.cardHeaderRow}>
                    <div className={s.cardTitle}>{item.nome}</div>
                    <span className={s.colorSwatch} style={{ backgroundColor: item.cor ?? '#3b82f6' }} title="Cor da bandeira" />
                  </div>
                  <div className={s.cardMeta}>
                    <span>{item.totalEleitores ?? 0} eleitores</span>
                    <span style={{ margin: '0 8px' }}>·</span>
                    <span>{item.totalCabos ?? 0} cabos</span>
                  </div>
                </div>

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
        title={editItem ? 'Editar Liderança' : 'Nova Liderança'}
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
          <label className={s.label}>Cor da bandeira</label>
          <div className={s.colorField}>
            <input className={s.colorInput} type="color" {...form.register('cor')} />
            <span className={s.colorValue}>{form.watch('cor') ?? '#3b82f6'}</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteItem}
        onClose={() => {
          setDeleteItem(null);
          setDeleteConfirmation('');
        }}
        title="Remover liderança"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              setDeleteItem(null);
              setDeleteConfirmation('');
            }}>Cancelar</Button>
            <Button variant="danger" onClick={onDelete} disabled={!canConfirmDelete} loading={deleting}>
              Confirmar remoção
            </Button>
          </>
        }
      >
        <div className={s.deleteConfirm}>
          <p className={s.deleteText}>Tem certeza que deseja remover este líder?</p>
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

export default function LideresPage() {
  return (
    <ToastProvider>
      <Layout title="Líder" breadcrumb="Gerencie os líderes e seus cabos eleitorais">
        <LideresContent />
      </Layout>
    </ToastProvider>
  );
}
