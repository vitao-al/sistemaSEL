'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search, Plus, Edit2, Trash2, ChevronUp, ChevronDown,
  ChevronsUpDown, Users, ChevronLeft, ChevronRight, Eye, MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/layout/Layout';
import { Button, Badge, Modal, ConfirmDialog, EmptyState, ToastProvider, useToast } from '@/components/ui';
import { getEleitores, createEleitor, updateEleitor, deleteEleitor, getCabos, validateEleitorUnique } from '@/lib/data';
import { CaboEleitoral, Eleitor } from '@/types';
import { useAuthStore } from '@/store/auth';
import s from './eleitores.module.css';

// Schema flexível: campos são opcionais porque o cadastro pode ser progressivo.
const eleitorSchema = z.object({
  nome: z.string().optional(),
  cpf: z.string().optional(),
  tituloEleitor: z.string().optional(),
  sessao: z.string().optional(),
  zona: z.string().optional(),
  localVotacao: z.string().optional(),
  promessa: z.string().optional(),
  promessaConcluida: z.boolean().optional(),
  caboEleitoralId: z.string().optional(),
});
type EleitorForm = z.infer<typeof eleitorSchema>;

function onlyDigits(value?: string) {
  return value?.replace(/\D/g, '');
}

// Máscara visual para CPF no input (persistência salva apenas dígitos).
function formatCpf(value?: string) {
  const digits = onlyDigits(value)?.slice(0, 11) ?? '';
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Máscara visual do título de eleitor para facilitar leitura durante digitação.
function formatTituloEleitor(value?: string) {
  const digits = onlyDigits(value)?.slice(0, 12) ?? '';
  return digits
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2');
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Normaliza payload antes de enviar para API para evitar lixo (espaços, máscara, campos vazios).
function sanitizeEleitorForm(data: EleitorForm): EleitorForm {
  const promessa = normalizeOptionalText(data.promessa);

  return {
    nome: normalizeOptionalText(data.nome),
    cpf: normalizeOptionalText(onlyDigits(data.cpf)),
    tituloEleitor: normalizeOptionalText(onlyDigits(data.tituloEleitor)),
    sessao: normalizeOptionalText(data.sessao),
    zona: normalizeOptionalText(data.zona),
    localVotacao: normalizeOptionalText(data.localVotacao),
    promessa,
    promessaConcluida: promessa ? !!data.promessaConcluida : false,
    caboEleitoralId: normalizeOptionalText(data.caboEleitoralId),
  };
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type SortField = 'nome' | 'zona' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PER_PAGE = 12;

function EleitorFormModal({
  open, onClose, initial, onSave, loading, isAdmin, cabos, selectedCaboId
}: {
  open: boolean;
  onClose: () => void;
  initial?: Eleitor | null;
  onSave: (data: EleitorForm) => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
  cabos: CaboEleitoral[];
  selectedCaboId?: string;
}) {
  const { register, handleSubmit, reset, watch, getValues, setError, clearErrors, formState: { errors } } = useForm<EleitorForm>({
    resolver: zodResolver(eleitorSchema),
  });

  const promessa = watch('promessa');
  const fixedCabo = selectedCaboId ? cabos.find(cabo => cabo.id === selectedCaboId) : null;
  const showCaboSelector = isAdmin && !fixedCabo;

  const validateUniqueField = useCallback(async (field: 'cpf' | 'tituloEleitor') => {
    const cpf = onlyDigits(getValues('cpf'));
    const tituloEleitor = onlyDigits(getValues('tituloEleitor'));

    if (field === 'cpf' && !cpf) {
      clearErrors('cpf');
      return;
    }

    if (field === 'tituloEleitor' && !tituloEleitor) {
      clearErrors('tituloEleitor');
      return;
    }

    try {
      const validation = await validateEleitorUnique({
        cpf: field === 'cpf' ? cpf : undefined,
        tituloEleitor: field === 'tituloEleitor' ? tituloEleitor : undefined,
        excludeId: initial?.id,
      });

      if (field === 'cpf') {
        if (!validation.cpfAvailable) {
          setError('cpf', { type: 'manual', message: 'CPF já cadastrado para outro eleitor.' });
        } else {
          clearErrors('cpf');
        }
      }

      if (field === 'tituloEleitor') {
        if (!validation.tituloEleitorAvailable) {
          setError('tituloEleitor', { type: 'manual', message: 'Título de eleitor já cadastrado para outro eleitor.' });
        } else {
          clearErrors('tituloEleitor');
        }
      }
    } catch {
      // Se a validação remota falhar, o backend ainda valida no submit.
    }
  }, [clearErrors, getValues, initial?.id, setError]);

  useEffect(() => {
    // Ao abrir o modal, hidrata com os dados atuais (edição) ou limpa o formulário (criação).
    if (open) {
      reset(initial ? {
        nome: initial.nome,
        cpf: initial.cpf,
        tituloEleitor: initial.tituloEleitor,
        sessao: initial.sessao,
        zona: initial.zona,
        localVotacao: initial.localVotacao,
        promessa: initial.promessa,
        promessaConcluida: initial.promessaConcluida,
        caboEleitoralId: selectedCaboId ?? initial.caboEleitoralId,
      } : { caboEleitoralId: selectedCaboId });
    }
  }, [open, initial, reset, selectedCaboId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar Eleitor' : 'Novo Eleitor'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit(onSave)}>
            {initial ? 'Salvar alterações' : 'Cadastrar eleitor'}
          </Button>
        </>
      }
    >
      <div className={s.formGrid}>
        {fixedCabo && (
          <div className={`${s.formField} ${s.formFull}`}>
            <label className={s.formLabel}>Cabo eleitoral</label>
            <div className={s.fixedCaboInfo}>
              <strong>{fixedCabo.nome}</strong>
              <span>Zona {fixedCabo.zona} • Título {fixedCabo.titulo}</span>
            </div>
          </div>
        )}

        {showCaboSelector && (
          <div className={`${s.formField} ${s.formFull}`}>
            <label className={s.formLabel}>Cabo eleitoral</label>
            <select {...register('caboEleitoralId')} className={s.formInput}>
              <option value="">Selecione o cabo</option>
              {cabos.map(cabo => <option key={cabo.id} value={cabo.id}>{cabo.nome} - Zona {cabo.zona}</option>)}
            </select>
          </div>
        )}

        <div className={`${s.formField} ${s.formFull}`}>
          <label className={s.formLabel}>Nome completo</label>
          <input {...register('nome')} className={s.formInput} placeholder="Ex: João da Silva" />
        </div>

        <div className={s.formField}>
          <label className={s.formLabel}>CPF</label>
          <input
            {...register('cpf', {
              onChange: event => {
                event.target.value = formatCpf(event.target.value);
                clearErrors('cpf');
              },
              onBlur: () => void validateUniqueField('cpf'),
            })}
            className={s.formInput}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
          {errors.cpf && <span className={s.formError}>{errors.cpf.message}</span>}
        </div>

        <div className={s.formField}>
          <label className={s.formLabel}>Título de Eleitor</label>
          <input
            {...register('tituloEleitor', {
              onChange: event => {
                event.target.value = formatTituloEleitor(event.target.value);
                clearErrors('tituloEleitor');
              },
              onBlur: () => void validateUniqueField('tituloEleitor'),
            })}
            className={s.formInput}
            placeholder="0000 0000 0000"
            inputMode="numeric"
          />
          {errors.tituloEleitor && <span className={s.formError}>{errors.tituloEleitor.message}</span>}
        </div>

        <div className={s.formField}>
          <label className={s.formLabel}>Sessão</label>
          <input {...register('sessao')} className={s.formInput} placeholder="0001" />
        </div>

        <div className={s.formField}>
          <label className={s.formLabel}>Zona</label>
          <input {...register('zona')} className={s.formInput} placeholder="001" />
        </div>

        <div className={`${s.formField} ${s.formFull}`}>
          <label className={s.formLabel}>Local de Votação</label>
          <input {...register('localVotacao')} className={s.formInput} placeholder="Ex: Escola Municipal João XXIII" />
        </div>

        <div className={`${s.formField} ${s.formFull} ${s.promessaSection}`}>
          <span className={s.promessaTitle}>Promessa</span>
          <textarea
            {...register('promessa')}
            className={s.formTextarea}
            placeholder="Descreva a promessa feita a este eleitor (opcional)"
            rows={3}
          />
          {promessa && (
            <label className={s.checkboxRow}>
              <input
                type="checkbox"
                {...register('promessaConcluida')}
                className={s.checkbox}
              />
              <span className={s.checkboxLabel}>Promessa concluída</span>
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}

function EleitorViewModal({ open, onClose, eleitor }: { open: boolean; onClose: () => void; eleitor: Eleitor | null }) {
  if (!eleitor) return null;

  // Lista de campos simples renderizados em grade para reaproveitar estrutura visual.
  const fields = [
    { label: 'Nome', value: eleitor.nome },
    { label: 'CPF', value: eleitor.cpf },
    { label: 'Título de Eleitor', value: eleitor.tituloEleitor },
    { label: 'Sessão', value: eleitor.sessao },
    { label: 'Zona', value: eleitor.zona },
    { label: 'Local de Votação', value: eleitor.localVotacao },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Detalhes do Eleitor" footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {getInitials(eleitor.nome)}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{eleitor.nome ?? 'Sem nome'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Cadastrado em {format(new Date(eleitor.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {fields.map(f => f.value && (
          <div key={f.label} style={{ background: 'var(--surface-bg)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{f.value}</div>
          </div>
        ))}
        {eleitor.localVotacao && (
          <div style={{ gridColumn: '1 / -1', background: 'var(--surface-bg)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Local de Votação</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{eleitor.localVotacao}</div>
          </div>
        )}
        {eleitor.promessa && (
          <div style={{ gridColumn: '1 / -1', background: eleitor.promessaConcluida ? 'var(--success-bg)' : 'var(--warning-bg)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: `1px solid ${eleitor.promessaConcluida ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: eleitor.promessaConcluida ? 'var(--success)' : 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
              Promessa — {eleitor.promessaConcluida ? 'Concluída ✓' : 'Pendente'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{eleitor.promessa}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function EleitoresContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [eleitores, setEleitores] = useState<Eleitor[]>([]);
  const [cabos, setCabos] = useState<CaboEleitoral[]>([]);
  const [totalEleitores, setTotalEleitores] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterPromessa, setFilterPromessa] = useState(searchParams.get('promessa') ?? '');
  const [filterCabo, setFilterCabo] = useState(searchParams.get('caboEleitoralId') ?? '');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Eleitor | null>(null);
  const [viewTarget, setViewTarget] = useState<Eleitor | null>(null);
  const [actionsTarget, setActionsTarget] = useState<Eleitor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Eleitor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedCabo = useMemo(
    () => cabos.find(cabo => cabo.id === filterCabo) ?? null,
    [cabos, filterCabo]
  );

  const eleitoresTitle = useMemo(() => {
    if (user?.role === 'cabo') {
      return `Eleitores cadastrados por ${user.nome}`;
    }

    if (selectedCabo) {
      return `Eleitores cadastrados por ${selectedCabo.nome}`;
    }

    return 'Eleitores cadastrados por todos os cabos';
  }, [selectedCabo, user?.nome, user?.role]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Filtros, ordenação e paginação ficam centralizados no backend para escalabilidade.
      const data = await getEleitores({
        search,
        zona: filterZona,
        promessa: filterPromessa as '' | 'concluida' | 'pendente' | 'sem',
        sortField,
        sortDir,
        caboEleitoralId: user?.role === 'admin' ? (filterCabo || undefined) : undefined,
        page,
        perPage: PER_PAGE,
      });

      setEleitores(data.items);
      setTotalEleitores(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, filterZona, filterPromessa, sortField, sortDir, page, filterCabo, user?.role]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    getCabos({ search: '', page: 1, perPage: 5000 })
      .then(result => setCabos(result.items))
      .catch(() => setCabos([]));
  }, [user?.role]);

  // Constrói opções de zona com base no recorte atual retornado pela API.
  const zonas = useMemo(() => {
    const set = new Set(eleitores.map(e => e.zona).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [eleitores]);

  const totalPages = Math.max(1, Math.ceil(totalEleitores / PER_PAGE));

  // Sempre volta para a primeira página quando filtros/ordenação mudam.
  useEffect(() => { setPage(1); }, [search, filterZona, filterPromessa, sortField, sortDir, filterCabo]);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  const handleOpenNew = () => { setEditTarget(null); setFormOpen(true); };
  const handleOpenEdit = (e: Eleitor) => { setEditTarget(e); setFormOpen(true); };

  const handleSave = async (data: EleitorForm) => {
    setSaving(true);
    const sanitizedData = sanitizeEleitorForm({
      ...data,
      caboEleitoralId: user?.role === 'admin' ? (filterCabo || data.caboEleitoralId) : data.caboEleitoralId,
    });
    try {
      if (user?.role === 'admin' && !sanitizedData.caboEleitoralId) {
        toast('Selecione um cabo eleitoral para o eleitor.', 'error');
        return;
      }
      if (editTarget) {
        const updated = await updateEleitor(editTarget.id, sanitizedData);
        setEleitores(prev => prev.map(e => e.id === updated.id ? updated : e));
        toast('Eleitor atualizado com sucesso!', 'success');
      } else {
        await createEleitor(sanitizedData);
        toast('Eleitor cadastrado com sucesso!', 'success');
      }
      setFormOpen(false);
      // Recarrega lista para refletir estado real do backend após create/update.
      await load();
    } catch (error) {
      toast(getErrorMessage(error, 'Erro ao salvar. Tente novamente.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEleitor(deleteTarget.id);
      toast('Eleitor removido.', 'info');
      setDeleteTarget(null);
      await load();
    } catch {
      toast('Erro ao remover. Tente novamente.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.sectionIntro}>
        <h2 className={s.sectionTitle}>{eleitoresTitle}</h2>
        <p className={s.sectionSubtitle}>
          {selectedCabo
            ? `Gerencie a base vinculada ao cabo ${selectedCabo.nome}.`
            : 'Use os filtros para localizar eleitores e acompanhar a base por cabo eleitoral.'}
        </p>
      </div>

      {/* Barra de pesquisa, filtros e ação primária */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon}><Search size={16} /></span>
          <input
            className={s.search}
            placeholder="Buscar por nome, CPF, título, zona, local…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={s.filters}>
          {user?.role === 'admin' && (
            <select className={s.select} value={filterCabo} onChange={e => setFilterCabo(e.target.value)}>
              <option value="">Todos os cabos</option>
              {cabos.map(cabo => <option key={cabo.id} value={cabo.id}>{cabo.nome} - Zona {cabo.zona}</option>)}
            </select>
          )}
          <select className={s.select} value={filterZona} onChange={e => setFilterZona(e.target.value)}>
            <option value="">Todas as zonas</option>
            {zonas.map(z => <option key={z} value={z}>Zona {z}</option>)}
          </select>
          <select className={s.select} value={filterPromessa} onChange={e => setFilterPromessa(e.target.value)}>
            <option value="">Todas as promessas</option>
            <option value="concluida">Concluídas</option>
            <option value="pendente">Pendentes</option>
            <option value="sem">Sem promessa</option>
          </select>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={handleOpenNew}>
          Novo Eleitor
        </Button>
      </div>

      {/* Tabela principal de eleitores com estados de loading/empty/lista */}
      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>
            {eleitoresTitle} <span className={s.tableCount}>({totalEleitores} encontrados)</span>
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Carregando eleitores…
          </div>
        ) : eleitores.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="Nenhum eleitor encontrado"
            description="Tente ajustar os filtros ou cadastre um novo eleitor."
            action={<Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenNew}>Cadastrar eleitor</Button>}
          />
        ) : (
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('nome')}><span className={s.thInner}>Nome <SortIcon field="nome" /></span></th>
                  <th>CPF</th>
                  <th>Título</th>
                  <th onClick={() => handleSort('zona')}><span className={s.thInner}>Zona <SortIcon field="zona" /></span></th>
                  <th>Sessão</th>
                  <th>Promessa</th>
                  <th onClick={() => handleSort('createdAt')}><span className={s.thInner}>Cadastro <SortIcon field="createdAt" /></span></th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {eleitores.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div className={s.voterName}>
                        <div className={s.avatar}>{getInitials(e.nome)}</div>
                        <span className={s.nameText}>{e.nome ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</span>
                      </div>
                    </td>
                    <td><span className={s.mono}>{e.cpf ?? '—'}</span></td>
                    <td><span className={s.mono}>{e.tituloEleitor ? e.tituloEleitor.slice(0, 8) + '…' : '—'}</span></td>
                    <td>{e.zona ? <Badge variant="neutral">Zona {e.zona}</Badge> : '—'}</td>
                    <td><span className={s.mono}>{e.sessao ?? '—'}</span></td>
                    <td>
                      {e.promessa
                        ? <Badge variant={e.promessaConcluida ? 'success' : 'warning'}>
                            {e.promessaConcluida ? 'Concluída' : 'Pendente'}
                          </Badge>
                        : <Badge variant="neutral">Sem promessa</Badge>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {format(new Date(e.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td>
                      <div className={s.actionsDesktop}>
                        <button className={s.actionBtn} title="Ver detalhes" onClick={() => setViewTarget(e)}>
                          <Eye size={15} />
                        </button>
                        <button className={`${s.actionBtn} ${s.actionBtnEdit}`} title="Editar" onClick={() => handleOpenEdit(e)}>
                          <Edit2 size={15} />
                        </button>
                        <button className={`${s.actionBtn} ${s.actionBtnDanger}`} title="Remover" onClick={() => setDeleteTarget(e)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className={s.actionsMobile}>
                        <button className={s.actionBtn} title="Mais ações" onClick={() => setActionsTarget(e)}>
                          <MoreHorizontal size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalEleitores > 0 && (
          <div className={s.pagination}>
            <span className={s.paginationInfo}>
              Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, totalEleitores)} de {totalEleitores}
            </span>
            <div className={s.paginationButtons}>
              <button className={s.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return (
                  <button key={p} className={`${s.pageBtn} ${page === p ? s.active : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}
              <button className={s.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais e confirmação de remoção */}
      <EleitorFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editTarget}
        onSave={handleSave}
        loading={saving}
        isAdmin={user?.role === 'admin'}
        cabos={cabos}
        selectedCaboId={filterCabo || undefined}
      />

      <EleitorViewModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        eleitor={viewTarget}
      />

      <Modal
        open={!!actionsTarget}
        onClose={() => setActionsTarget(null)}
        title="Ações do eleitor"
        footer={<Button variant="secondary" onClick={() => setActionsTarget(null)}>Fechar</Button>}
      >
        {actionsTarget && (
          <div className={s.mobileActionsModal}>
            <div className={s.mobileActionsTitle}>{actionsTarget.nome ?? 'Eleitor sem nome'}</div>
            <button
              className={s.mobileActionItem}
              onClick={() => {
                setViewTarget(actionsTarget);
                setActionsTarget(null);
              }}
            >
              <Eye size={15} /> Ver detalhes
            </button>
            <button
              className={s.mobileActionItem}
              onClick={() => {
                handleOpenEdit(actionsTarget);
                setActionsTarget(null);
              }}
            >
              <Edit2 size={15} /> Editar
            </button>
            <button
              className={`${s.mobileActionItem} ${s.mobileActionDanger}`}
              onClick={() => {
                setDeleteTarget(actionsTarget);
                setActionsTarget(null);
              }}
            >
              <Trash2 size={15} /> Remover
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remover eleitor"
        description={`Tem certeza que deseja remover "${deleteTarget?.nome ?? 'este eleitor'}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

export default function EleitoresPage() {
  return (
    <ToastProvider>
      <Layout title="Eleitores" breadcrumb="Gestão da base de apoiadores">
        <EleitoresContent />
      </Layout>
    </ToastProvider>
  );
}
