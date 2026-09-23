'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Badge, Button, Modal } from '@/components/ui';
import RetryNotice from '@/components/ui/RetryNotice';
import { addFamiliaMembro, getCabos, getEleitores, getFamilias } from '@/lib/data';
import { groupFamiliaMembrosPorGrau } from '@/lib/familias';
import type { CaboEleitoral, Eleitor, Familia } from '@/types';
import s from '../familias.module.css';

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

export default function FamiliaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [cabos, setCabos] = useState<CaboEleitoral[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberCaboFilter, setMemberCaboFilter] = useState('all');
  const [memberSearchResults, setMemberSearchResults] = useState<Eleitor[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Eleitor | null>(null);
  const [selectedGrauParentesco, setSelectedGrauParentesco] = useState('Pai');
  const [addingMember, setAddingMember] = useState(false);
  const memberSearchRequestRef = useRef(0);

  const loadFamilia = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const familias = await getFamilias();
      const selected = familias.find(item => item.id === params.id) ?? null;
      setFamilia(selected);
    } catch (error) {
      console.error('Erro ao carregar família.');
      setFamilia(null);
      const msg = error instanceof Error ? error.message : '';
      setLoadError(
        msg && !msg.includes('(') && !msg.includes('at ') && !msg.includes('function')
          ? msg
          : 'Falha ao carregar família.'
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadFamilia();
  }, [loadFamilia]);

  useEffect(() => {
    const loadCabos = async () => {
      try {
        const result = await getCabos({ page: 1, perPage: 100 });
        setCabos(result.items);
      } catch {
        setCabos([]);
      }
    };

    void loadCabos();
  }, []);

  const fetchMemberSearchResults = useCallback(async (term: string, caboId: string) => {
    const normalized = term.trim();

    if (!memberModalOpen) {
      setMemberSearchResults([]);
      return;
    }

    if (!normalized || normalized.length < 2) {
      setMemberSearchResults([]);
      setMemberSearchLoading(false);
      return;
    }

    const requestId = ++memberSearchRequestRef.current;

    try {
      setMemberSearchLoading(true);
      const result = await getEleitores({
        search: normalized,
        caboEleitoralId: caboId === 'all' ? undefined : caboId,
        page: 1,
        perPage: 100,
        sortField: 'nome',
        sortDir: 'asc',
      });

      if (requestId !== memberSearchRequestRef.current) {
        return;
      }

      const existingIds = new Set((familia?.membros ?? []).map(item => item.eleitorId));
      setMemberSearchResults(result.items.filter(item => !existingIds.has(item.id)));
    } catch {
      if (requestId === memberSearchRequestRef.current) {
        setMemberSearchResults([]);
      }
    } finally {
      if (requestId === memberSearchRequestRef.current) {
        setMemberSearchLoading(false);
      }
    }
  }, [familia, memberModalOpen]);

  useEffect(() => {
    if (!memberModalOpen) {
      setMemberSearchResults([]);
      setMemberSearchLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      void fetchMemberSearchResults(memberSearch, memberCaboFilter);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [fetchMemberSearchResults, memberCaboFilter, memberModalOpen, memberSearch]);

  const resetMemberModal = () => {
    setMemberModalOpen(false);
    setMemberSearch('');
    setMemberCaboFilter('all');
    setMemberSearchResults([]);
    setSelectedMember(null);
    setSelectedGrauParentesco('Pai');
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;

    try {
      setAddingMember(true);
      await addFamiliaMembro(params.id, {
        eleitorId: selectedMember.id,
        grauParentesco: selectedGrauParentesco,
      });

      resetMemberModal();
      await loadFamilia();
    } finally {
      setAddingMember(false);
    }
  };

  const groupedMembers = useMemo(() => {
    const total = familia?.membros ?? [];

    return groupFamiliaMembrosPorGrau(total).map(group => ({
      ...group,
      membros: [...group.membros].sort((left, right) => {
        const leftName = (left.eleitor?.nome ?? left.id).trim().toLocaleLowerCase('pt-BR');
        const rightName = (right.eleitor?.nome ?? right.id).trim().toLocaleLowerCase('pt-BR');
        return leftName.localeCompare(rightName, 'pt-BR');
      }),
    }));
  }, [familia]);

  if (loading) {
    return (
      <Layout title="FAMÍLIA" breadcrumb="Detalhes da família">
        <div className={s.loading}>Carregando família...</div>
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout title="FAMÍLIA" breadcrumb="Detalhes da família">
        <div style={{ padding: 18 }}>
          <RetryNotice message={loadError} onRetry={loadFamilia} />
        </div>
      </Layout>
    );
  }

  if (!familia) {
    return (
      <Layout title="FAMÍLIA" breadcrumb="Detalhes da família">
        <div className={s.emptyState}>Família não encontrada.</div>
      </Layout>
    );
  }

  return (
    <Layout title={familia.nome || 'Família'} breadcrumb="Detalhes da família">
      <div className={s.detailPage}>
        <div className={s.detailHeader}>
          <div>
            <div className={s.detailLabel}>Detalhes da família</div>
            <h3>{familia.nome || 'Família sem nome'}</h3>
          </div>

          <div className={s.detailActions}>
            <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={() => router.push('/familias')}>
              Voltar
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setMemberModalOpen(true)}>
              Adicionar familiar
            </Button>
          </div>
        </div>

        <div className={s.metaGrid}>
          <div className={s.metaItem}>
            <span>ID</span>
            <strong>{familia.id}</strong>
          </div>
          <div className={s.metaItem}>
            <span>Cabo responsável</span>
            <strong>{familia.caboEleitoral?.nome || 'Não informado'}</strong>
          </div>
          <div className={s.metaItem}>
            <span>Integrantes</span>
            <strong>{familia.membros?.length ?? 0}</strong>
          </div>
        </div>

        <div className={s.groupsSection}>
          {groupedMembers.length === 0 ? (
            <div className={s.emptyState}>Nenhum eleitor vinculado a esta família.</div>
          ) : (
            groupedMembers.map(group => (
              <div key={group.grau} className={s.groupBlock}>
                <div className={s.groupTitle}>
                  <Badge variant="info">{group.grau}</Badge>
                </div>

                <div className={s.memberList}>
                  {group.membros.map(member => (
                    <div key={member.id} className={s.memberRow}>
                      <div className={s.memberInfo}>
                        <strong>{member.eleitor?.nome || 'Eleitor sem nome'}</strong>
                        <span>
                          {member.eleitor?.tituloEleitor || 'Sem título'} • {member.eleitor?.zona || 'Zona não informada'}
                        </span>
                      </div>
                      <div className={s.memberMeta}>
                        <Users size={14} />
                        {member.grauParentesco || 'Sem grau'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        open={memberModalOpen}
        onClose={resetMemberModal}
        title="Adicionar familiar"
        footer={
          <Button variant="secondary" onClick={resetMemberModal}>
            Fechar
          </Button>
        }
      >
        <div className={s.formGrid}>
          <div className={s.filterRow}>
            <label className={s.label}>Cabo eleitoral</label>
            <select
              className={s.filterSelect}
              value={memberCaboFilter}
              onChange={event => setMemberCaboFilter(event.target.value)}
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
            value={memberSearch}
            onChange={event => setMemberSearch(event.target.value)}
            placeholder="Digite nome, título, sessão ou zona"
            autoFocus
          />

          {selectedMember && (
            <div className={s.selectionSection}>
              <label className={s.label}>Grau de parentesco</label>
              <select
                className={s.filterSelect}
                value={selectedGrauParentesco}
                onChange={event => setSelectedGrauParentesco(event.target.value)}
              >
                {GRAUS_PARENTESCO.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <Button variant="primary" loading={addingMember} onClick={() => void handleAddMember()}>
                Adicionar à família
              </Button>
            </div>
          )}

          <div className={s.searchResults}>
            {memberSearchLoading ? (
              <div className={s.emptyState}>Buscando eleitores...</div>
            ) : !memberSearch.trim() ? (
              <div className={s.emptyState}>Digite algo para localizar eleitores.</div>
            ) : memberSearchResults.length === 0 ? (
              <div className={s.emptyState}>Nenhum eleitor encontrado para esta busca.</div>
            ) : (
              memberSearchResults.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={s.resultRow}
                  onClick={() => {
                    setSelectedMember(item);
                    setSelectedGrauParentesco('Pai');
                  }}
                >
                  <div>
                    <strong>{item.nome || 'Eleitor sem nome'}</strong>
                    <span>{item.tituloEleitor || 'Sem título'} • {item.zona || 'Zona não informada'}</span>
                  </div>
                  <span className={s.resultBadge}>{selectedMember?.id === item.id ? 'Selecionado' : 'Selecionar'}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
