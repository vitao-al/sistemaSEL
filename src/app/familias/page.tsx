'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Eye, Plus, Search, Trash2, Users } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button, ConfirmDialog, EmptyState, Modal, ToastProvider, useToast } from '@/components/ui';
import {
  addFamiliaMembro,
  createFamilia,
  deleteFamilia,
  getCabos,
  getEleitores,
  getFamilias,
  updateFamilia,
} from '@/lib/data';
import RetryNotice from '@/components/ui/RetryNotice';
import { sortFamiliasPorNome } from '@/lib/familias';
import { useAuthStore } from '@/store/auth';
import type { CaboEleitoral, Eleitor, Familia } from '@/types';
import s from './familias.module.css';

const EMPTY_FORM = {
  nome: '',
  caboEleitoralId: '',
  eleitorId: '',
  grauParentesco: '',
};

const GRAUS_PARENTESCO = [
  'Pai',
  'Mãe',
  'Filho(a)',
  'Tio(a)',
  'Avô',
  'Avó',
  'Padrasto',
  'Enteado(a)',
  'Madastra',
  'Padrinho',
  'Madrinha',
  'Namorado(a)',
  'Esposa',
  'Marido',
  'Outros',
];

export default function FamiliasPage() {
  return (
    <ToastProvider>
      <Layout title="FAMILIAS" breadcrumb="Vínculos familiares e parentesco">
        <FamiliasContent />
      </Layout>
    </ToastProvider>
  );
}

function FamiliasContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [eleitores, setEleitores] = useState<Eleitor[]>([]);
  const [cabos, setCabos] = useState<CaboEleitoral[]>([]);
  const [search, setSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState<Familia | null>(null);
  const [deleteItem, setDeleteItem] = useState<Familia | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eleitorSearchOpen, setEleitorSearchOpen] = useState(false);
  const [eleitorSearch, setEleitorSearch] = useState('');
  const [eleitorCaboFilter, setEleitorCaboFilter] = useState('all');
  const [eleitorSearchResults, setEleitorSearchResults] = useState<Eleitor[]>([]);
  const [eleitorSearchLoading, setEleitorSearchLoading] = useState(false);
  const [selectedEleitores, setSelectedEleitores] = useState<Array<{ eleitor: Eleitor; grauParentesco: string }>>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [eleitoresLoading, setEleitoresLoading] = useState(false);
  const searchRequestRef = useRef(0);

  const loadEleitoresSnapshot = useCallback(async () => {
    if (eleitores.length > 0 || eleitoresLoading) return;

    setEleitoresLoading(true);
    try {
      const result = await getEleitores({ page: 1, perPage: 100, sortField: 'nome', sortDir: 'asc' });
      setEleitores(result.items);
    } catch {
      console.error('Erro ao carregar eleitores para a tela de famílias.');
      setEleitores([]);
      setDataError('Não foi possível carregar os eleitores para cadastro em massa. Você pode continuar usando as buscas do modal.');
    } finally {
      setEleitoresLoading(false);
    }
  }, [eleitores.length, eleitoresLoading]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setDataError(null);

    try {
      const [familiasResult, cabosResult] = await Promise.allSettled([
        getFamilias(),
        getCabos({ page: 1, perPage: 100 }),
      ]);

      if (familiasResult.status === 'rejected') {
        throw new Error('Falha ao carregar famílias.');
      }

      setFamilias(sortFamiliasPorNome(familiasResult.value));

      if (cabosResult.status === 'fulfilled') {
        setCabos(cabosResult.value.items);
      } else {
        console.error('Erro ao carregar cabos na listagem de famílias.');
        setCabos([]);
        setDataError('Famílias carregadas, mas não foi possível atualizar a lista de cabos responsáveis.');
      }
    } catch {
      console.error('Erro ao carregar a listagem de famílias.');
      setFamilias([]);
      setCabos([]);
      setDataError('Não foi possível carregar a lista de famílias. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sortedFamilias = useMemo(() => sortFamiliasPorNome(familias), [familias]);

  const filteredFamilias = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedFamilias;

    return sortedFamilias.filter(item => {
      const values = [item.nome, item.id, item.caboEleitoral?.nome];
      return values.some(value => value?.toLowerCase().includes(term));
    });
  }, [search, sortedFamilias]);

  const availableToSelect = useMemo(() => {
    const selectedIds = new Set(selectedEleitores.map(item => item.eleitor.id));
    return eleitores.filter(item => !selectedIds.has(item.id));
  }, [eleitores, selectedEleitores]);

  const fetchEleitorSearchResults = useCallback(async (term: string, caboId: string) => {
    const normalizedTerm = term.trim();

    if (!eleitorSearchOpen) {
      setEleitorSearchResults([]);
      return;
    }

    if (!normalizedTerm || normalizedTerm.length < 2) {
      setEleitorSearchResults([]);
      setEleitorSearchLoading(false);
      return;
    }

    const requestId = ++searchRequestRef.current;

    try {
      setEleitorSearchLoading(true);
      const result = await getEleitores({
        search: normalizedTerm,
        caboEleitoralId: caboId === 'all' ? undefined : caboId,
        page: 1,
        perPage: 100,
        sortField: 'nome',
        sortDir: 'asc',
      });

      if (requestId !== searchRequestRef.current) {
        return;
      }

      const selectedIds = new Set(selectedEleitores.map(item => item.eleitor.id));
      setEleitorSearchResults(result.items.filter(item => !selectedIds.has(item.id)));
    } catch {
      if (requestId === searchRequestRef.current) {
        setEleitorSearchResults([]);
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setEleitorSearchLoading(false);
      }
    }
  }, [eleitorSearchOpen, selectedEleitores]);

  useEffect(() => {
    if (!eleitorSearchOpen) {
      setEleitorSearchResults([]);
      setEleitorSearchLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchEleitorSearchResults(eleitorSearch, eleitorCaboFilter);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [eleitorSearch, eleitorCaboFilter, eleitorSearchOpen, fetchEleitorSearchResults]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditItem(null);
    setSelectedEleitores([]);
    setEleitorSearch('');
    setEleitorCaboFilter('all');
    setEleitorSearchResults([]);
    setEleitorSearchOpen(false);
  };

  const openCreate = () => {
    resetForm();
    void loadEleitoresSnapshot();
    setForm(prev => ({
      ...prev,
      caboEleitoralId: user?.role === 'admin' ? (cabos[0]?.id ?? '') : '',
    }));
    setOpenForm(true);
  };

  const openEdit = async (item: Familia) => {
    const membros = (item.membros ?? []).filter((membro): membro is NonNullable<typeof membro> & { eleitor: Eleitor } => Boolean(membro.eleitor));

    await loadEleitoresSnapshot();
    setEditItem(item);
    setSelectedEleitores(membros.map(membro => ({
      eleitor: membro.eleitor,
      grauParentesco: membro.grauParentesco ?? '',
    })));
    setForm({
      nome: item.nome ?? '',
      caboEleitoralId: item.caboEleitoralId ?? '',
      eleitorId: '',
      grauParentesco: '',
    });
    setOpenForm(true);
  };

  const handleAddEleitorToSelection = (eleitor: Eleitor) => {
    setSelectedEleitores(prev => {
      if (prev.some(item => item.eleitor.id === eleitor.id)) return prev;
      return [...prev, { eleitor, grauParentesco: '' }];
    });
    setEleitorSearch('');
    setEleitorCaboFilter('all');
    setEleitorSearchOpen(false);
  };

  const handleGrauParentescoChange = (eleitorId: string, value: string, customValue?: string) => {
    const nextValue = value === 'Outros' ? (customValue?.trim() || 'Outros') : value;

    setSelectedEleitores(prev => prev.map(item =>
      item.eleitor.id === eleitorId ? { ...item, grauParentesco: nextValue } : item
    ));
  };

  const handleRemoveEleitorSelection = (id: string) => {
    setSelectedEleitores(prev => prev.filter(item => item.eleitor.id !== id));
  };

  const handleSubmit = async () => {
    const nome = form.nome.trim();
    if (!nome) {
      toast('Informe o nome da família.', 'error');
      return;
    }

    const selectedCaboId = user?.role === 'admin' ? (form.caboEleitoralId || cabos[0]?.id || '') : '';
    if (user?.role === 'admin' && !selectedCaboId) {
      toast('Selecione o cabo eleitoral responsável pela família.', 'error');
      return;
    }

    const existingMemberIds = new Set((editItem?.membros ?? []).map(item => item.eleitorId));
    const membrosParaSalvar = selectedEleitores.filter(item => !existingMemberIds.has(item.eleitor.id));

    if (form.eleitorId && form.grauParentesco.trim()) {
      const eleitorSelecionado = eleitores.find(item => item.id === form.eleitorId);
      if (eleitorSelecionado && !existingMemberIds.has(eleitorSelecionado.id)) {
        membrosParaSalvar.push({ eleitor: eleitorSelecionado, grauParentesco: form.grauParentesco.trim() });
      }
    }

    const invalidMembers = membrosParaSalvar.filter(item => !item.grauParentesco.trim());
    if (invalidMembers.length > 0) {
      toast('Informe o grau de parentesco de todos os eleitores selecionados.', 'error');
      return;
    }

    try {
      setSaving(true);

      let currentFamily: Familia;
      if (editItem) {
        currentFamily = await updateFamilia(editItem.id, { nome });
      } else {
        currentFamily = await createFamilia({
          nome,
          caboEleitoralId: selectedCaboId || undefined,
        });
      }

      const membrosToCreate = membrosParaSalvar.map(item => ({
        eleitorId: item.eleitor.id,
        grauParentesco: item.grauParentesco.trim(),
      }));

      if (membrosToCreate.length > 0) {
        const memberResults = await Promise.allSettled(
          membrosToCreate.map(item => addFamiliaMembro(currentFamily.id, item))
        );

        const failedMember = memberResults.find(result => result.status === 'rejected');
        if (failedMember) {
          throw new Error('Algum eleitor não pôde ser vinculado à família.');
        }
      }

      setOpenForm(false);
      resetForm();
      await loadData();
      toast(editItem ? 'Família atualizada.' : 'Família cadastrada.', 'success');
    } catch {
      console.error('Erro ao salvar família.');
      toast('Falha ao salvar a família. Verifique os dados e tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFamilia = async (id: string) => {
    if (!deleteItem) return;

    try {
      await deleteFamilia(id);
      setDeleteItem(null);
      await loadData();
      toast('Família removida.', 'info');
    } catch {
      toast('Falha ao remover família.', 'error');
    }
  };

  return (
    <div className={s.page}>
      <div className={s.sectionIntro}>
        <div>
          <h2 className={s.sectionTitle}>Famílias</h2>
          <p className={s.sectionSubtitle}>Gerencie os vínculos familiares e a hierarquia por grau de parentesco.</p>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.search}
            placeholder="Buscar por nome, ID ou cabo responsável"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>Nova família</Button>
      </div>

      {loading ? (
        <div className={s.loading}>Carregando famílias...</div>
      ) : dataError ? (
        <div style={{ padding: 18 }}>
          <RetryNotice message={dataError} onRetry={loadData} />
        </div>
      ) : filteredFamilias.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Nenhuma família encontrada"
          description="Cadastre uma nova família para começar o registro de parentesco."
          action={<Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>Cadastrar família</Button>}
        />
      ) : (
        <div className={s.tableCard}>
          <div className={s.tableHeader}>
            <span className={s.tableTitle}>{filteredFamilias.length} família(s)</span>
          </div>

          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Cabo responsável</th>
                  <th>Integrantes</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredFamilias.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className={s.voterName}>
                        <div className={s.avatar}>{(item.nome ?? 'F').slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className={s.nameText}>{item.nome || 'Família sem nome'}</div>
                          <div className={s.rowMeta}>ID: {item.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{item.caboEleitoral?.nome || 'Não informado'}</td>
                    <td>{item.membros?.length ?? 0} membro(s)</td>
                    <td>
                      <div className={s.actionsDesktop}>
                        <button className={s.actionBtn} title="Detalhes" onClick={() => router.push(`/familias/${item.id}`)}>
                          <Eye size={15} />
                        </button>
                        <button className={s.actionBtn} title="Editar" onClick={() => openEdit(item)}>
                          <Edit2 size={15} />
                        </button>
                        <button className={`${s.actionBtn} ${s.actionBtnDanger}`} title="Remover" onClick={() => setDeleteItem(item)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editItem ? 'Editar família' : 'Nova família'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSubmit}>{editItem ? 'Salvar' : 'Cadastrar'}</Button>
          </>
        }
      >
        <div className={s.formGrid}>
          {user?.role === 'admin' && (
            <>
              <label className={s.label}>Cabo eleitoral responsável</label>
              <select
                className={s.input}
                value={form.caboEleitoralId}
                onChange={event => setForm(prev => ({ ...prev, caboEleitoralId: event.target.value }))}
              >
                <option value="">Selecione o cabo</option>
                {cabos.map(cabo => (
                  <option key={cabo.id} value={cabo.id}>{cabo.nome} - Zona {cabo.zona}</option>
                ))}
              </select>
            </>
          )}

          <label className={s.label}>Nome da família</label>
          <input
            className={s.input}
            value={form.nome}
            onChange={event => setForm(prev => ({ ...prev, nome: event.target.value }))}
            placeholder="Ex.: Família Silva"
          />

          <div className={s.selectionSection}>
            <div className={s.selectionHeader}>
              <label className={s.label}>Eleitores selecionados</label>
              <Button variant="secondary" onClick={() => setEleitorSearchOpen(true)}>Adicionar eleitor</Button>
            </div>

            {selectedEleitores.length === 0 ? (
              <div className={s.emptyState}>Nenhum eleitor adicionado a esta família.</div>
            ) : (
              <div className={s.selectedList}>
                {selectedEleitores.map(({ eleitor, grauParentesco }) => {
                  const isCustomOther = !!grauParentesco && !GRAUS_PARENTESCO.includes(grauParentesco);
                  const selectedValue = isCustomOther ? 'Outros' : grauParentesco;

                  return (
                    <div key={eleitor.id} className={s.selectedItem}>
                      <div className={s.selectedMeta}>
                        <strong>{eleitor.nome || 'Eleitor sem nome'}</strong>
                        <span>{eleitor.tituloEleitor || 'Sem título'} • {eleitor.zona || 'Zona não informada'}</span>
                      </div>

                      <div className={s.selectedActions}>
                        <select
                          className={s.input}
                          value={selectedValue}
                          onChange={event => handleGrauParentescoChange(eleitor.id, event.target.value, isCustomOther ? grauParentesco : undefined)}
                        >
                          <option value="">Selecione o grau</option>
                          {GRAUS_PARENTESCO.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>

                        {selectedValue === 'Outros' && (
                          <input
                            className={s.input}
                            value={isCustomOther ? grauParentesco : ''}
                            onChange={event => handleGrauParentescoChange(eleitor.id, 'Outros', event.target.value)}
                            placeholder="Descreva o grau"
                          />
                        )}

                        <button type="button" className={s.removeBtn} onClick={() => handleRemoveEleitorSelection(eleitor.id)}>
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={eleitorSearchOpen}
        onClose={() => {
          setEleitorSearch('');
          setEleitorCaboFilter('all');
          setEleitorSearchResults([]);
          setEleitorSearchOpen(false);
        }}
        title="Adicionar eleitor"
        footer={
          <Button variant="secondary" onClick={() => {
            setEleitorSearch('');
            setEleitorCaboFilter('all');
            setEleitorSearchResults([]);
            setEleitorSearchOpen(false);
          }}>
            Fechar
          </Button>
        }
      >
        <div className={s.formGrid}>
          <div className={s.filterRow}>
            <label className={s.label}>Cabo eleitoral</label>
            <select
              className={s.filterSelect}
              value={eleitorCaboFilter}
              onChange={event => setEleitorCaboFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {cabos.map(cabo => (
                <option key={cabo.id} value={cabo.id}>{cabo.nome}</option>
              ))}
            </select>
          </div>

          <label className={s.label}>Buscar eleitor</label>
          <input
            className={s.input}
            value={eleitorSearch}
            onChange={event => setEleitorSearch(event.target.value)}
            placeholder="Digite para buscar..."
            autoFocus
          />

          <div className={s.searchResults}>
            {eleitorSearchLoading ? (
              <div className={s.emptyState}>Buscando eleitores...</div>
            ) : !eleitorSearch.trim() ? (
              <div className={s.emptyState}>Digite algo para localizar eleitores.</div>
            ) : eleitorSearchResults.length === 0 ? (
              <div className={s.emptyState}>Nenhum eleitor encontrado para esta busca.</div>
            ) : (
              eleitorSearchResults.map(item => (
                <button key={item.id} type="button" className={s.resultRow} onClick={() => handleAddEleitorToSelection(item)}>
                  <div>
                    <strong>{item.nome || 'Eleitor sem nome'}</strong>
                    <span>{item.tituloEleitor || 'Sem título'} • {item.zona || 'Zona não informada'}</span>
                  </div>
                  <span className={s.resultBadge}>Selecionar</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        title="Remover família"
        description={`Tem certeza que deseja remover "${deleteItem?.nome ?? ''}"?`}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => {
          if (deleteItem) void handleDeleteFamilia(deleteItem.id);
        }}
      />
    </div>
  );
}
