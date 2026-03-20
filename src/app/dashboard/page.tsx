'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, CheckCircle2, Clock, UserPlus, TrendingUp, Plus, CalendarClock, UserCheck } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { StatCard, ChartCard, Skeleton } from '@/components/ui';
import { getDashboardStats } from '@/lib/data';
import { HttpClientError } from '@/lib/http/client';
import { useAuthStore } from '@/store/auth';
import { DashboardStats } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import s from './dashboard.module.css';

const COLORS = ['#F97316', '#FB923C', '#94A3B8'];
const PIE_COLORS = ['#10B981', '#F59E0B', '#94A3B8'];

// Exibe iniciais no avatar quando não há foto do eleitor.
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// Tooltip reutilizado por todos os gráficos para manter consistência visual.
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 13 }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const data = await getDashboardStats();
        if (!mounted) return;
        setStats(data);
        setError(null);
      } catch (requestError) {
        if (!mounted) return;

        // Sessão expirada: força limpeza local e volta para login.
        if (requestError instanceof HttpClientError && requestError.status === 401) {
          logout();
          router.replace('/login');
          return;
        }

        const message = requestError instanceof Error
          ? requestError.message
          : 'Falha ao carregar os dados do dashboard.';
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();

    // Mantém dashboard atualizado sem exigir refresh manual.
    const intervalId = window.setInterval(loadStats, 30000);
    // Ao voltar para a aba, recarrega os números para reduzir chance de dado stale.
    const onFocus = () => {
      loadStats();
    };

    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (loading) {
    return (
      <Layout title="Dashboard" breadcrumb="Visão geral da campanha">
        <div className={s.page}>
          <div className={s.skeletonStats}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={s.skeletonCard}>
                <Skeleton height={14} width={100} />
                <Skeleton height={32} width={80} />
                <Skeleton height={12} width={120} />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Estado de erro com fallback amigável (evita tela em branco quando API falha).
  if (!stats) {
    return (
      <Layout title="Dashboard" breadcrumb="Visão geral da campanha">
        <div className={s.page}>
          <div className={s.lastVoterCard}>
            <div className={s.lastVoterTitle}>Não foi possível carregar o dashboard</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
              {error ?? 'Tente atualizar a página em instantes.'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalComPromessa = stats.promessasConcluidas + stats.promessasPendentes;

  return (
    <Layout title="Dashboard" breadcrumb="Visão geral da campanha">
      <div className={s.page}>
        {/* Cards de KPI principais */}
        <div className={s.statsGrid}>
          <StatCard
            label="Total de Eleitores"
            value={stats.totalEleitores.toLocaleString()}
            icon={<Users size={20} />}
            iconBg="rgba(249,115,22,0.1)"
            iconColor="var(--brand-primary)"
            badge={stats.totalEleitoresVariacao}
            badgeUp
            description="vs mês passado"
            onClick={() => router.push('/eleitores')}
            delay={0}
          />
          <StatCard
            label="Promessas Concluídas"
            value={stats.promessasConcluidas}
            icon={<CheckCircle2 size={20} />}
            iconBg="rgba(16,185,129,0.1)"
            iconColor="var(--success)"
            badge={stats.promessasConcluidasVariacao}
            badgeUp
            description={`de ${totalComPromessa} com promessa`}
            onClick={() => router.push('/eleitores?promessa=concluida')}
            delay={80}
          />
          <StatCard
            label="Promessas Pendentes"
            value={stats.promessasPendentes}
            icon={<Clock size={20} />}
            iconBg="rgba(245,158,11,0.1)"
            iconColor="var(--warning)"
            description={`${totalComPromessa > 0 ? Math.round((stats.promessasPendentes / totalComPromessa) * 100) : 0}% do total de promessas`}
            onClick={() => router.push('/eleitores?promessa=pendente')}
            delay={160}
          />
          <div
            className={s.bannerCard}
            onClick={() => router.push(user?.role === 'admin' ? '/cabos' : '/eleitores')}
            style={{ cursor: 'pointer' }}
          >
            <div className={s.bannerBg} />
            <div className={s.bannerBg2} />
            <div className={s.bannerLabel}>Ação rápida</div>
            <div className={s.bannerValue} style={{ fontSize: 22 }}>{user?.role === 'admin' ? 'Gerenciar Cabos' : 'Adicionar Eleitor'}</div>
            <div className={s.bannerBadge}>
              <Plus size={12} />
              {user?.role === 'admin' ? 'Abrir gestão' : 'Cadastrar novo'}
            </div>
          </div>
        </div>

        {/* Primeira linha de gráficos: tendência + distribuição */}
        <div className={s.chartsGrid}>
          <ChartCard
            title="Eleitores por Mês"
            subtitle="Evolução do cadastro ao longo do ano"
            delay={200}
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.eleitoresPorMes} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEleitores" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Eleitores"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  fill="url(#gradEleitores)"
                  dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#F97316', strokeWidth: 2, stroke: 'white' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Distribuição de Promessas"
            subtitle="Status atual"
            delay={250}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.promessasPorStatus}
                  cx="50%"
                  cy="48%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="total"
                  nameKey="status"
                >
                  {stats.promessasPorStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(val) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Segunda linha: ranking de zonas + último cadastro */}
        <div className={s.chartsBottom}>
          <ChartCard
            title="Zonas mais Ativas"
            subtitle="Eleitores por zona eleitoral"
            delay={300}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.zonasMaisAtivas} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal vertical={false} />
                <XAxis dataKey="zona" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Eleitores" fill="#F97316" radius={[6, 6, 0, 0]}>
                  {stats.zonasMaisAtivas.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#F97316' : i === 1 ? '#FB923C' : '#FED7AA'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Card de contexto operacional sobre o último eleitor cadastrado */}
          <div className={s.lastVoterCard}>
            <div className={s.lastVoterHeader}>
              <div className={s.lastVoterTitle}>Último Eleitor Adicionado</div>
              {stats.ultimoEleitorAdicionado && (
                <div className={s.lastVoterTimestamp}>
                  <CalendarClock size={12} />
                  {format(new Date(stats.ultimoEleitorAdicionado.createdAt), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
            </div>
            {stats.ultimoEleitorAdicionado ? (
              <>
                <div className={s.voterRow}>
                  <div className={s.voterAvatar}>
                    {getInitials(stats.ultimoEleitorAdicionado.nome ?? 'NN')}
                  </div>
                  <div className={s.voterInfo}>
                    <div className={s.voterName}>{stats.ultimoEleitorAdicionado.nome ?? '—'}</div>
                    <div className={s.voterMeta}>
                      {format(new Date(stats.ultimoEleitorAdicionado.createdAt), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>

                {/* Cabo que cadastrou */}
                {stats.ultimoEleitorAdicionado.caboEleitoral && (
                  <div className={s.caboEleitoral}>
                    <div className={s.caboEleitoralIcon}>
                      <UserCheck size={14} />
                    </div>
                    <div className={s.caboEleitoralInfo}>
                      <span className={s.caboEleitoralLabel}>Cadastrado por</span>
                      <span className={s.caboEleitoralName}>{stats.ultimoEleitorAdicionado.caboEleitoral.nome}</span>
                    </div>
                  </div>
                )}

                <div className={s.voterFields}>
                  <div className={s.voterField}>
                    <div className={s.voterFieldLabel}>Zona</div>
                    <div className={s.voterFieldValue}>{stats.ultimoEleitorAdicionado.zona ?? '—'}</div>
                  </div>
                  <div className={s.voterField}>
                    <div className={s.voterFieldLabel}>Sessão</div>
                    <div className={s.voterFieldValue}>{stats.ultimoEleitorAdicionado.sessao ?? '—'}</div>
                  </div>
                  <div className={s.voterField} style={{ gridColumn: '1 / -1' }}>
                    <div className={s.voterFieldLabel}>Local de Votação</div>
                    <div className={s.voterFieldValue} style={{ fontFamily: 'var(--font-sans)', fontSize: 13 }}>
                      {stats.ultimoEleitorAdicionado.localVotacao ?? '—'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nenhum eleitor cadastrado.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
