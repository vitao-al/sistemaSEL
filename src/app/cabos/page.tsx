'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Plus, Users, Trash2, Edit2, Download } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button, ConfirmDialog, EmptyState, Modal, ToastProvider, useToast } from '@/components/ui';
import { CaboEleitoral } from '@/types';
import { createCabo, deleteCabo, getCabos, getCabosReport, updateCabo } from '@/lib/data';
import { useAuthStore } from '@/store/auth';
import s from './cabos.module.css';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  titulo: z.string().min(1, 'Título obrigatório'),
  zona: z.string().min(1, 'Zona obrigatória'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
});

type CaboForm = z.infer<typeof formSchema>;
type ReportFormat = 'excel' | 'csv' | 'pdf';
type ReportData = {
  generatedAt: string;
  admins: Array<{
    admin: {
      id: string;
      nome: string;
      email: string;
      cargo?: string;
    };
    cabos: Array<{ cabo: CaboEleitoral; eleitores: any[] }>;
    metrics: {
      totalCabos: number;
      totalEleitores: number;
      totalPromessas: number;
      totalPromessasConcluidas: number;
      totalPromessasPendentes: number;
    };
  }>;
  metrics: {
    totalAdmins: number;
    totalCabos: number;
    totalEleitores: number;
    totalPromessas: number;
    totalPromessasConcluidas: number;
    totalPromessasPendentes: number;
  };
};

const PER_PAGE = 9;

function downloadFile(content: BlobPart | BlobPart[], filename: string, mimeType: string) {
  const blob = new Blob(Array.isArray(content) ? content : [content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function flattenReportRows(report: ReportData) {
  return report.admins.flatMap(({ admin, cabos }) =>
    cabos.flatMap(({ cabo, eleitores }) => {
      if (eleitores.length === 0) {
        return [[
          admin.nome,
          cabo.nome,
          cabo.titulo,
          cabo.zona,
          cabo.email,
          '-',
          '-',
          '-',
          '-',
          '-',
        ]];
      }

      return eleitores.map(eleitor => [
        admin.nome,
        cabo.nome,
        cabo.titulo,
        cabo.zona,
        cabo.email,
        eleitor.nome ?? '-',
        eleitor.cpf ?? '-',
        eleitor.tituloEleitor ?? '-',
        eleitor.localVotacao ?? '-',
        new Date(eleitor.createdAt).toLocaleString('pt-BR'),
      ]);
    })
  );
}

function buildExcelContent(report: ReportData) {
  const rows = flattenReportRows(report);

  const tableRows = rows
    .map(row => `<tr>${row.map(col => `<td>${escapeHtml(col)}</td>`).join('')}</tr>`)
    .join('');

  return `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <table border="1">
          <tr>
            <th>Admin</th><th>Cabo</th><th>Título Cabo</th><th>Zona Cabo</th><th>Email Cabo</th>
            <th>Eleitor</th><th>CPF</th><th>Título Eleitor</th><th>Local Votação</th><th>Cadastro</th>
          </tr>
          ${tableRows}
        </table>
      </body>
    </html>
  `;
}

function buildCsvContent(report: ReportData) {
  const header = [
    'Admin',
    'Cabo',
    'Título Cabo',
    'Zona Cabo',
    'Email Cabo',
    'Eleitor',
    'CPF',
    'Título Eleitor',
    'Local Votação',
    'Cadastro',
  ];

  const rows = flattenReportRows(report);

  return ['\uFEFF' + header.map(escapeCsv).join(';'), ...rows.map(row => row.map(escapeCsv).join(';'))].join('\n');
}

async function buildStyledPdf(report: ReportData) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryColor: [number, number, number] = [249, 115, 22];
  const secondaryColor: [number, number, number] = [30, 41, 59];
  const successColor: [number, number, number] = [16, 185, 129];
  const pendingColor: [number, number, number] = [245, 158, 11];

  const drawHeader = (title: string, subtitle?: string) => {
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, 14, 11);

    if (subtitle) {
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(subtitle, 14, 24);
    }
  };

  const kpiCard = (x: number, y: number, w: number, h: number, label: string, value: number, color: [number, number, number]) => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(String(value), x + 4, y + 10);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, x + 4, y + 18);
  };

  const toShortName = (value: string, max = 24) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

  drawHeader('SISTEMA SEL • RELATÓRIO EXECUTIVO', `Gerado em ${new Date(report.generatedAt).toLocaleString('pt-BR')}`);

  const cardStartY = 30;
  const cardGap = 8;
  const cardWidth = (pageWidth - 28 - cardGap) / 2;
  kpiCard(14, cardStartY, cardWidth, 22, 'ADMINS', report.metrics.totalAdmins, secondaryColor);
  kpiCard(14 + cardWidth + cardGap, cardStartY, cardWidth, 22, 'CABOS', report.metrics.totalCabos, primaryColor);
  kpiCard(14, cardStartY + 26, cardWidth, 22, 'ELEITORES', report.metrics.totalEleitores, secondaryColor);
  kpiCard(14 + cardWidth + cardGap, cardStartY + 26, cardWidth, 22, 'PROMESSAS', report.metrics.totalPromessas, successColor);

  const barsY = 84;
  const barsW = pageWidth - 28;
  const barsH = 54;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, barsY, barsW, barsH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, barsY, barsW, barsH, 2, 2, 'S');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Eleitores por Admin', 18, barsY + 7);

  const adminBars = report.admins
    .map(item => ({ name: item.admin.nome, total: item.metrics.totalEleitores }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const maxAdminValue = Math.max(1, ...adminBars.map(item => item.total));
  adminBars.forEach((item, index) => {
    const rowY = barsY + 12 + index * 8;
    const barWidth = (item.total / maxAdminValue) * (barsW - 82);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(toShortName(item.name, 22), 18, rowY + 4);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(64, rowY, barWidth, 4.5, 'F');
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.total), 67 + barWidth, rowY + 4);
  });

  const promisesY = 143;
  const promisesW = pageWidth - 28;
  const promisesH = 30;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, promisesY, promisesW, promisesH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, promisesY, promisesW, promisesH, 2, 2, 'S');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Status de Promessas', 18, promisesY + 7);

  const completed = report.metrics.totalPromessasConcluidas;
  const pending = report.metrics.totalPromessasPendentes;
  const totalPromises = Math.max(1, completed + pending);
  const completedWidth = ((promisesW - 20) * completed) / totalPromises;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(18, promisesY + 10, promisesW - 20, 8, 2, 2, 'F');
  doc.setFillColor(successColor[0], successColor[1], successColor[2]);
  doc.roundedRect(18, promisesY + 10, completedWidth, 8, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Concluídas: ${completed}`, 18, promisesY + 23);
  doc.setTextColor(pendingColor[0], pendingColor[1], pendingColor[2]);
  doc.text(`Pendentes: ${pending}`, 68, promisesY + 23);
  doc.setTextColor(71, 85, 105);
  doc.text(`Taxa de conclusão: ${Math.round((completed / totalPromises) * 100)}%`, 118, promisesY + 23);

  autoTable(doc, {
    startY: 178,
    head: [['Admin', 'Cabos', 'Eleitores', 'Promessas', 'Concluídas', 'Pendentes']],
    body: report.admins.map(item => [
      item.admin.nome,
      String(item.metrics.totalCabos),
      String(item.metrics.totalEleitores),
      String(item.metrics.totalPromessas),
      String(item.metrics.totalPromessasConcluidas),
      String(item.metrics.totalPromessasPendentes),
    ]),
    styles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      cellPadding: 1.8,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  report.admins.forEach(({ admin, cabos }) => {
    doc.addPage('a4', 'portrait');
    drawHeader(`Admin: ${admin.nome}`, `Email: ${admin.email}`);

    const totalCabos = cabos.length;
    const totalEleitores = cabos.reduce((acc, current) => acc + current.eleitores.length, 0);
    const totalPromessas = cabos.reduce((acc, current) => acc + current.eleitores.filter(item => item.promessa).length, 0);
    const totalConcluidas = cabos.reduce((acc, current) => acc + current.eleitores.filter(item => item.promessaConcluida).length, 0);

    kpiCard(14, 30, cardWidth, 20, 'CABOS', totalCabos, primaryColor);
    kpiCard(14 + cardWidth + cardGap, 30, cardWidth, 20, 'ELEITORES', totalEleitores, secondaryColor);
    kpiCard(14, 54, cardWidth, 20, 'PROMESSAS', totalPromessas, successColor);
    kpiCard(14 + cardWidth + cardGap, 54, cardWidth, 20, 'CONCLUÍDAS', totalConcluidas, successColor);

    let cursorY = 80;

    cabos.forEach(({ cabo, eleitores }) => {
      if (cursorY > 250) {
        doc.addPage('a4', 'portrait');
        drawHeader(`Admin: ${admin.nome}`, `Continuação • ${admin.email}`);
        cursorY = 28;
      }

      doc.setFillColor(249, 115, 22);
      doc.rect(14, cursorY, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Cabo: ${cabo.nome} • Zona ${cabo.zona} • Título ${cabo.titulo}`, 16, cursorY + 5.5);

      cursorY += 10;

      if (eleitores.length === 0) {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('Sem eleitores cadastrados para este cabo.', 16, cursorY + 4);
        cursorY += 10;
        return;
      }

      autoTable(doc, {
        startY: cursorY,
        head: [['Nome', 'CPF', 'Título', 'Zona', 'Sessão', 'Local', 'Status']],
        body: eleitores.map(eleitor => [
          eleitor.nome ?? '-',
          eleitor.cpf ?? '-',
          eleitor.tituloEleitor ?? '-',
          eleitor.zona ?? '-',
          eleitor.sessao ?? '-',
          toShortName(eleitor.localVotacao ?? '-', 24),
          eleitor.promessa ? (eleitor.promessaConcluida ? 'Concluída' : 'Pendente') : 'Sem promessa',
        ]),
        styles: {
          fontSize: 6.5,
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          cellPadding: 1.4,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      });

      cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY) + 6;
    });
  });

  const totalPages = doc.getNumberOfPages();
  for (let index = 1; index <= totalPages; index += 1) {
    doc.setPage(index);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${index} de ${totalPages}`, pageWidth - 36, pageHeight - 6);
  }

  return doc.output('arraybuffer');
}

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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const form = useForm<CaboForm>({ resolver: zodResolver(formSchema) });
  const isAdmin = user?.role === 'admin';

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
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setEditItem(null);
    form.reset({ nome: '', titulo: '', zona: '', email: '', senha: '' });
    setOpenForm(true);
  };

  const openEdit = (item: CaboEleitoral) => {
    setEditItem(item);
    form.reset({ nome: item.nome, titulo: item.titulo, zona: item.zona, email: item.email, senha: '' });
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

  const onDownloadReport = async (format: ReportFormat) => {
    setReportLoading(true);
    try {
      const report = await getCabosReport();
      if (format === 'excel') {
        downloadFile(buildExcelContent(report), 'relatorio-cabos-eleitores.xls', 'application/vnd.ms-excel;charset=utf-8;');
      }

      if (format === 'csv') {
        downloadFile(buildCsvContent(report), 'relatorio-cabos-eleitores.csv', 'text/csv;charset=utf-8;');
      }

      if (format === 'pdf') {
        const pdfBuffer = await buildStyledPdf(report);
        downloadFile(pdfBuffer, 'relatorio-cabos-eleitores.pdf', 'application/pdf');
      }

      setReportOpen(false);
      toast('Relatório gerado com sucesso.', 'success');
    } catch {
      toast('Falha ao gerar relatório.', 'error');
    } finally {
      setReportLoading(false);
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
          {isAdmin && (
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => setReportOpen(true)}>
              Download relatório
            </Button>
          )}
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

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Exportar relatório"
        footer={<Button variant="secondary" onClick={() => setReportOpen(false)}>Fechar</Button>}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Escolha o formato do relatório que deseja baixar.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            <Button variant="primary" loading={reportLoading} onClick={() => void onDownloadReport('pdf')}>
              Baixar PDF
            </Button>
            <Button variant="secondary" loading={reportLoading} onClick={() => void onDownloadReport('excel')}>
              Baixar planilha
            </Button>
            <Button variant="secondary" loading={reportLoading} onClick={() => void onDownloadReport('csv')}>
              Baixar CSV
            </Button>
          </div>
        </div>
      </Modal>
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
