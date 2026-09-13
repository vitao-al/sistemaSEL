'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileText, TrendingUp } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button, Modal, ToastProvider, useToast } from '@/components/ui';
import { getCabosReport } from '@/lib/data';
import s from './relatorios.module.css';

type ReportType = 'geral' | 'zona';
type ReportData = Awaited<ReturnType<typeof getCabosReport>>;

type ReportCardConfig = {
  id: ReportType;
  title: string;
  description: string;
  badge: string;
};

const REPORT_CARDS: ReportCardConfig[] = [
  {
    id: 'geral',
    title: 'Relatório geral',
    description: 'Resumo executivo com totais de cabos, eleitores e desempenho geral da base eleitoral.',
    badge: 'Resumo executivo',
  },
  {
    id: 'zona',
    title: 'Relatório por zona',
    description: 'Distribuição de eleitores por zona e participação percentual de cada cabo eleitoral.',
    badge: 'Distribuição geográfica',
  },
];

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

function normalizeZona(value?: string | null) {
  return (value ?? '').trim() || 'Não informado';
}

function getColumnHeaders(type: ReportType) {
  if (type === 'geral') {
    return ['Admin', 'Cabo', 'Total eleitores', 'Zona', 'Título', 'Email'];
  }

  return ['Zona', 'Total de eleitores', '% do total', 'Cabos envolvidos', 'Maior cabo'];
}

function buildCsvContent(report: ReportData, type: ReportType) {
  const header = getColumnHeaders(type);

  const rows = type === 'geral'
    ? report.admins.flatMap(({ admin, cabos }) => cabos.map(({ cabo, eleitores }) => [
        admin.nome,
        cabo.nome,
        eleitores.length,
        cabo.zona,
        cabo.titulo,
        cabo.email,
      ]))
    : (() => {
        const zoneMap = new Map<string, { total: number; cabos: Array<{ nome: string; total: number }> }>();

        report.admins.forEach(({ cabos }) => {
          cabos.forEach(({ cabo, eleitores }) => {
            eleitores.forEach((eleitor) => {
              const zone = normalizeZona(eleitor.zona ?? cabo.zona);
              const current = zoneMap.get(zone) ?? { total: 0, cabos: [] };
              current.total += 1;

              const caboEntry = current.cabos.find(item => item.nome === cabo.nome);
              if (caboEntry) {
                caboEntry.total += 1;
              } else {
                current.cabos.push({ nome: cabo.nome, total: 1 });
              }

              zoneMap.set(zone, current);
            });
          });
        });

        const totalEleitores = report.metrics.totalEleitores || 1;

        return Array.from(zoneMap.entries()).map(([zona, info]) => {
          const topCabo = [...info.cabos].sort((a, b) => b.total - a.total)[0];
          return [
            zona,
            info.total,
            Number(((info.total / totalEleitores) * 100).toFixed(2)),
            info.cabos.length,
            topCabo?.nome ?? 'Sem cabo',
          ];
        });
      })();

  return ['\uFEFF' + header.map(escapeCsv).join(';'), ...rows.map(row => row.map(escapeCsv).join(';'))].join('\n');
}

function buildExcelContent(report: ReportData, type: ReportType) {
  const header = getColumnHeaders(type);

  const rows = type === 'geral'
    ? report.admins.flatMap(({ admin, cabos }) => cabos.map(({ cabo, eleitores }) => [
        admin.nome,
        cabo.nome,
        eleitores.length,
        cabo.zona,
        cabo.titulo,
        cabo.email,
      ]))
    : (() => {
        const zoneMap = new Map<string, { total: number; cabos: Array<{ nome: string; total: number }> }>();

        report.admins.forEach(({ cabos }) => {
          cabos.forEach(({ cabo, eleitores }) => {
            eleitores.forEach((eleitor) => {
              const zone = normalizeZona(eleitor.zona ?? cabo.zona);
              const current = zoneMap.get(zone) ?? { total: 0, cabos: [] };
              current.total += 1;

              const caboEntry = current.cabos.find(item => item.nome === cabo.nome);
              if (caboEntry) {
                caboEntry.total += 1;
              } else {
                current.cabos.push({ nome: cabo.nome, total: 1 });
              }

              zoneMap.set(zone, current);
            });
          });
        });

        const totalEleitores = report.metrics.totalEleitores || 1;

        return Array.from(zoneMap.entries()).map(([zona, info]) => {
          const topCabo = [...info.cabos].sort((a, b) => b.total - a.total)[0];
          return [
            zona,
            info.total,
            `${Number(((info.total / totalEleitores) * 100).toFixed(2))}%`,
            info.cabos.length,
            topCabo?.nome ?? 'Sem cabo',
          ];
        });
      })();

  const tableRows = [header, ...rows]
    .map(row => `<tr>${row.map(col => `<td>${escapeHtml(col)}</td>`).join('')}</tr>`)
    .join('');

  return `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <table border="1">
          ${tableRows}
        </table>
      </body>
    </html>
  `;
}

async function buildPdf(report: ReportData, type: ReportType) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(type === 'geral' ? 'SISTEMA SEL • RELATÓRIO GERAL' : 'SISTEMA SEL • RELATÓRIO POR ZONA', 14, 11);

  if (type === 'geral') {
    const promiseBreakdown = [
      { label: 'Concluídas', total: report.metrics.totalPromessasConcluidas, color: [16, 185, 129] },
      { label: 'Pendentes', total: report.metrics.totalPromessasPendentes, color: [245, 158, 11] },
    ];

    const totalPromises = Math.max(1, report.metrics.totalPromessas);
    const zoneMap = new Map<string, number>();
    const sessionMap = new Map<string, number>();

    report.admins.forEach(({ cabos }) => {
      cabos.forEach(({ cabo, eleitores }) => {
        eleitores.forEach((eleitor) => {
          const zone = normalizeZona(eleitor.zona ?? cabo.zona);
          zoneMap.set(zone, (zoneMap.get(zone) ?? 0) + 1);
          const session = String(eleitor.sessao ?? 'Não informado');
          sessionMap.set(session, (sessionMap.get(session) ?? 0) + 1);
        });
      });
    });

    const zoneSummary = Array.from(zoneMap.entries())
      .map(([label, total]) => ({ label, total, percentage: Number(((total / Math.max(1, report.metrics.totalEleitores)) * 100).toFixed(1)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const sessionSummary = Array.from(sessionMap.entries())
      .map(([label, total]) => ({ label, total, percentage: Number(((total / Math.max(1, report.metrics.totalEleitores)) * 100).toFixed(1)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const summaryCards = [
      { label: 'Cabos', value: String(report.metrics.totalCabos) },
      { label: 'Eleitores', value: String(report.metrics.totalEleitores) },
      { label: 'Promessas', value: String(report.metrics.totalPromessas) },
      { label: 'Concluídas', value: String(report.metrics.totalPromessasConcluidas) },
    ];

    const xPositions = [14, 110, 14, 110];
    const yPositions = [30, 30, 48, 48];

    summaryCards.forEach((card, index) => {
      const x = xPositions[index];
      const y = yPositions[index];
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, 82, 15, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, 82, 15, 2, 2, 'S');
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(card.label, x + 4, y + 6);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(card.value, x + 4, y + 12);
    });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PROMESSAS', 14, 72);
    let chartY = 76;
    promiseBreakdown.forEach((item) => {
      const barWidth = (item.total / totalPromises) * 52;
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${item.label}: ${item.total}`, 14, chartY + 3);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(80, chartY - 3, 60, 5, 1.5, 1.5, 'F');
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.roundedRect(80, chartY - 3, barWidth, 5, 1.5, 1.5, 'F');
      chartY += 9;
    });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ZONAS', 14, 110);
    chartY = 114;
    zoneSummary.forEach((item) => {
      const barWidth = (item.percentage / 100) * 90;
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`${item.label} (${item.total})`, 14, chartY + 2);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(80, chartY - 3, 90, 5, 1.5, 1.5, 'F');
      doc.setFillColor(249, 115, 22);
      doc.roundedRect(80, chartY - 3, barWidth, 5, 1.5, 1.5, 'F');
      chartY += 9;
    });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SESSÕES', 14, 170);
    chartY = 174;
    sessionSummary.forEach((item) => {
      const barWidth = (item.percentage / 100) * 90;
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`${item.label} (${item.total})`, 14, chartY + 2);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(80, chartY - 3, 90, 5, 1.5, 1.5, 'F');
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(80, chartY - 3, barWidth, 5, 1.5, 1.5, 'F');
      chartY += 9;
    });

    // Monta tabela detalhada por eleitor com todos os campos disponíveis no modelo
    const tableHead = [
      'Admin',
      'Cabo',
      'Nome',
      'CPF',
      'Título',
      'Zona',
      'Sessão',
      'Telefone',
      'Local Votação',
      'Promessa',
      'Promessa Concluída',
      'Criado Em',
    ];

    const tableBody = report.admins.flatMap(({ admin, cabos }) =>
      cabos.flatMap(({ cabo, eleitores }) =>
        eleitores.map((e) => [
          admin.nome,
          cabo.nome,
          e.nome ?? 'Sem nome',
          e.cpf ?? '-',
          e.tituloEleitor ?? '-',
          e.zona ?? '-',
          String(e.sessao ?? '-'),
          e.telefone ?? '-',
          e.localVotacao ?? '-',
          e.promessa ?? '-',
          e.promessaConcluida ? 'Sim' : 'Não',
          e.createdAt ? new Date(e.createdAt).toLocaleString() : '-',
        ])
      )
    );

    const finalY = 220;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DETALHAMENTO DE ELEITORES', 14, finalY);

    // Paleta de cores para cabeçalhos de cabo (vai alternando)
    const caboColors = [
      [59, 130, 246], // azul
      [16, 185, 129], // verde
      [234, 88, 12],  // laranja
      [168, 85, 247], // roxo
      [239, 68, 68],  // vermelho
    ];

    let currentY = finalY + 6;

    // Cabeçalhos de colunas padronizados (ABNT: colunas claras e ordenadas)
    // Adiciona coluna de status da promessa
    const colHeaders = ['Nome', 'CPF', 'Título', 'Zona', 'Sessão', 'Telefone', 'Local', 'Promessa', 'Status'];

    // Larguras em mm das colunas para caber em A4 (ajustar para centralizar)
    const colWidths = [40, 20, 18, 12, 10, 22, 28, 26, 10];
    const totalColWidth = colWidths.reduce((s, v) => s + v, 0);
    const sideMargin = Math.max(8, (pageWidth - totalColWidth) / 2);

    // Construir uma única tabela que contenha todos os blocos por cabo.
    const fullBody: any[] = [];
    let colorIndex = 0;

    for (const { admin, cabos } of report.admins) {
      for (const { cabo, eleitores } of cabos) {
        const color = caboColors[colorIndex % caboColors.length];
        colorIndex += 1;

        const caboInfo = `Cabo: ${cabo.nome} • Zona ${cabo.zona ?? '-'} • Título ${cabo.titulo ?? '-'}`;

        // linha de cabeçalho do bloco (cor de fundo do cabo)
        fullBody.push([
          {
            content: caboInfo,
            colSpan: colHeaders.length,
            styles: { fillColor: color, textColor: [255, 255, 255], halign: 'left', fontStyle: 'bold' },
          },
        ]);

        // cabeçalho das colunas para o bloco (visualmente destacado)
        fullBody.push(colHeaders.map(h => ({ content: h, styles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' } })));

        // linhas de eleitores (ordenadas alfabeticamente por nome)
        const sortedEleitores = [...eleitores].sort((a, b) => String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR', { sensitivity: 'base' }));
        if (sortedEleitores.length === 0) {
          fullBody.push([{ content: 'Sem eleitores cadastrados', colSpan: colHeaders.length, styles: { textColor: [100, 116, 139] } }]);
        } else {
          sortedEleitores.forEach(e => {
            const status = e.promessa ? (e.promessaConcluida ? 'Concluída' : 'Pendente') : 'Sem promessa';
            fullBody.push([
              e.nome ?? '-',
              e.cpf ?? '-',
              e.tituloEleitor ?? '-',
              e.zona ?? '-',
              String(e.sessao ?? '-'),
              e.telefone ?? '-',
              e.localVotacao ?? '-',
              e.promessa ?? '-',
              status,
            ]);
          });
        }
      }
    }

    autoTable(doc, {
      startY: currentY,
      head: [],
      body: fullBody,
      styles: {
        fontSize: 7.2,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        cellPadding: 1.5,
        overflow: 'linebreak',
        valign: 'top',
      },
      bodyStyles: { valign: 'top' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: sideMargin, right: sideMargin },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: colWidths[0], overflow: 'linebreak' },
        1: { cellWidth: colWidths[1] },
        2: { cellWidth: colWidths[2] },
        3: { cellWidth: colWidths[3] },
        4: { cellWidth: colWidths[4] },
        5: { cellWidth: colWidths[5] },
        6: { cellWidth: colWidths[6], overflow: 'linebreak' },
        7: { cellWidth: colWidths[7], overflow: 'linebreak' },
        8: { cellWidth: colWidths[8], overflow: 'linebreak' },
      },
      didParseCell: (data) => {
        // ensure header-like rows (our block headers) use bold text and full-width
        // `data.row.raw` can contain primitives or CellDef objects; guard safely
        try {
          const raw = data.row.raw;
          if (Array.isArray(raw) && raw.length === 1) {
            const first: any = raw[0];
            if (first && typeof first === 'object' && 'colSpan' in first) {
              data.cell.styles.fontStyle = 'bold';
            }
          }
        } catch {
          // ignore type guard errors at runtime
        }
      },
    });

    return doc.output('arraybuffer');
  }

  const rows = (() => {
    const zoneMap = new Map<string, { total: number; cabos: Array<{ nome: string; total: number }> }>();
    report.admins.forEach(({ cabos }) => {
      cabos.forEach(({ cabo, eleitores }) => {
        eleitores.forEach((eleitor) => {
          const zone = normalizeZona(eleitor.zona ?? cabo.zona);
          const current = zoneMap.get(zone) ?? { total: 0, cabos: [] };
          current.total += 1;
          const caboEntry = current.cabos.find(item => item.nome === cabo.nome);
          if (caboEntry) caboEntry.total += 1;
          else current.cabos.push({ nome: cabo.nome, total: 1 });
          zoneMap.set(zone, current);
        });
      });
    });
    const totalEleitores = report.metrics.totalEleitores || 1;
    return Array.from(zoneMap.entries()).map(([zona, info]) => {
      const topCabo = [...info.cabos].sort((a, b) => b.total - a.total)[0];
      return [
        zona,
        String(info.total),
        `${Number(((info.total / totalEleitores) * 100).toFixed(2))}%`,
        String(info.cabos.length),
        topCabo?.nome ?? 'Sem cabo',
      ];
    });
  })();

  autoTable(doc, {
    startY: 26,
    head: [getColumnHeaders(type)],
    body: rows,
    styles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });

  return doc.output('arraybuffer');
}

function sumEleitoresPorCabo(cabo: { eleitores: Array<{ nome?: string | null }> }) {
  return cabo.eleitores.length;
}

function RelatoriosPage() {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [showDebugError, setShowDebugError] = useState(false);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCabosReport();
      setReportData(data);
    } catch (error) {
      console.error('Erro ao carregar relatórios.', error);
      setReportData(null);
      toast('Não foi possível carregar os relatórios do sistema.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  const zoneSummary = useMemo(() => {
    if (!reportData) return [] as Array<{ zona: string; total: number; percentage: number; cabos: Array<{ nome: string; total: number }> }>;

    const zoneMap = new Map<string, { total: number; cabos: Map<string, number> }>();

    reportData.admins.forEach(({ cabos }) => {
      cabos.forEach(({ cabo, eleitores }) => {
        eleitores.forEach((eleitor) => {
          const zona = normalizeZona(eleitor.zona ?? cabo.zona);
          const current = zoneMap.get(zona) ?? { total: 0, cabos: new Map() };
          current.total += 1;
          current.cabos.set(cabo.nome, (current.cabos.get(cabo.nome) ?? 0) + 1);
          zoneMap.set(zona, current);
        });
      });
    });

    const total = reportData.metrics.totalEleitores || 1;

    return Array.from(zoneMap.entries())
      .map(([zona, info]) => ({
        zona,
        total: info.total,
        percentage: Number(((info.total / total) * 100).toFixed(2)),
        cabos: Array.from(info.cabos.entries()).map(([nome, totalPorCabo]) => ({ nome, total: totalPorCabo })).sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [reportData]);

  const reportMeta = useMemo(() => {
    if (!reportData) return null;

    return reportData.admins.flatMap(({ admin, cabos }) => cabos.map(({ cabo, eleitores }) => ({
      admin: admin.nome,
      cabo: cabo.nome,
      totalEleitores: eleitores.length,
      zona: cabo.zona,
      titulo: cabo.titulo,
      email: cabo.email,
      eleitores: [...eleitores].sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '')),
    }))).sort((a, b) => b.totalEleitores - a.totalEleitores);
  }, [reportData]);

  const promiseBreakdown = useMemo(() => {
    if (!reportData) return [] as Array<{ label: string; total: number; color: string; percentage: number }>;

    const total = Math.max(1, reportData.metrics.totalPromessas);
    const concluida = reportData.metrics.totalPromessasConcluidas;
    const pendente = Math.max(0, reportData.metrics.totalPromessasPendentes);

    return [
      { label: 'Concluídas', total: concluida, color: '#10b981' },
      { label: 'Pendentes', total: pendente, color: '#f59e0b' },
    ].map(item => ({ ...item, percentage: Number(((item.total / total) * 100).toFixed(1)) }));
  }, [reportData]);

  const zoneBreakdown = useMemo(() => {
    if (!reportData) return [] as Array<{ label: string; total: number; percentage: number }>;

    const zoneMap = new Map<string, number>();

    reportData.admins.forEach(({ cabos }) => {
      cabos.forEach(({ cabo, eleitores }) => {
        eleitores.forEach((eleitor) => {
          const zone = normalizeZona(eleitor.zona ?? cabo.zona);
          zoneMap.set(zone, (zoneMap.get(zone) ?? 0) + 1);
        });
      });
    });

    const total = Math.max(1, reportData.metrics.totalEleitores);

    return Array.from(zoneMap.entries())
      .map(([label, totalByZone]) => ({
        label,
        total: totalByZone,
        percentage: Number(((totalByZone / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [reportData]);

  const sessionBreakdown = useMemo(() => {
    if (!reportData) return [] as Array<{ label: string; total: number; percentage: number }>;

    const sessionMap = new Map<string, number>();

    reportData.admins.forEach(({ cabos }) => {
      cabos.forEach(({ cabo, eleitores }) => {
        eleitores.forEach((eleitor) => {
          const label = String(eleitor.sessao ?? 'Não informado');
          sessionMap.set(label, (sessionMap.get(label) ?? 0) + 1);
        });
      });
    });

    const total = Math.max(1, reportData.metrics.totalEleitores);

    return Array.from(sessionMap.entries())
      .map(([label, totalBySession]) => ({
        label,
        total: totalBySession,
        percentage: Number(((totalBySession / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [reportData]);

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!reportData || !selectedReport) return;

    setReportLoading(true);

    try {
      if (format === 'csv') {
        downloadFile(buildCsvContent(reportData, selectedReport), selectedReport === 'geral' ? 'relatorio-geral.csv' : 'relatorio-por-zona.csv', 'text/csv;charset=utf-8;');
      }

      if (format === 'excel') {
        downloadFile(buildExcelContent(reportData, selectedReport), selectedReport === 'geral' ? 'relatorio-geral.xls' : 'relatorio-por-zona.xls', 'application/vnd.ms-excel;charset=utf-8;');
      }

      if (format === 'pdf') {
        const pdfBuffer = await buildPdf(reportData, selectedReport);
        downloadFile(pdfBuffer, selectedReport === 'geral' ? 'relatorio-geral.pdf' : 'relatorio-por-zona.pdf', 'application/pdf');
      }

      toast('Relatório exportado com sucesso.', 'success');
      setSelectedReport(null);
    } catch (error) {
      console.error('Erro ao exportar relatório.', error);
      const msg = error instanceof Error ? `${error.message}\n\n${error.stack ?? ''}` : String(error);
      setDebugError(msg);
      setShowDebugError(true);
      toast('Não foi possível exportar o relatório selecionado. Abra o modal de erro para mais detalhes.', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const exportDebugPdf = async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/cabos/report/debug-sample');
      const payload = await res.json();
      if (!payload?.success) throw new Error(payload?.error?.message ?? 'Erro ao obter sample');
      const reportSample = payload.data as ReportData;
      const pdfBuffer = await buildPdf(reportSample, 'geral');
      downloadFile(pdfBuffer, 'relatorio-geral-debug.pdf', 'application/pdf');
      toast('Relatório debug exportado com sucesso.', 'success');
    } catch (error) {
      console.error('Erro ao exportar relatório debug.', error);
      const msg = error instanceof Error ? `${error.message}\n\n${error.stack ?? ''}` : String(error);
      setDebugError(msg);
      setShowDebugError(true);
      toast('Não foi possível exportar o relatório de debug. Abra o modal de erro para mais detalhes.', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Layout title="Relatórios" breadcrumb="Resumo executivo e indicadores por zona">
      <div className={s.page}>
        <div className={s.headerRow}>
          <div>
            <div className={s.eyebrow}>Centro de relatórios</div>
            <h2 className={s.heading}>Tipos de relatório</h2>
          </div>
        </div>

        {loading ? (
          <div className={s.loading}>Carregando relatórios...</div>
        ) : !reportData ? (
          <div className={s.empty}>Não foi possível carregar os relatórios no momento.</div>
        ) : (
          <div className={s.grid}>
            {REPORT_CARDS.map((report) => (
              <div key={report.id} className={s.reportCard}>
                <div className={s.cardHeader}>
                  <div className={s.iconWrap}>
                    {report.id === 'geral' ? <FileText size={18} /> : <BarChart3 size={18} />}
                  </div>
                  <span className={s.badge}>{report.badge}</span>
                </div>

                <div className={s.cardTitle}>{report.title}</div>
                <p className={s.cardDescription}>{report.description}</p>

                {report.id === 'geral' && (
                  <div className={s.inlineStats}>
                    <div>
                      <span>Total de cabos</span>
                      <strong>{reportData.metrics.totalCabos}</strong>
                    </div>
                    <div>
                      <span>Total de eleitores</span>
                      <strong>{reportData.metrics.totalEleitores}</strong>
                    </div>
                  </div>
                )}

                {report.id === 'zona' && (
                  <div className={s.inlineStats}>
                    <div>
                      <span>Zonas ativas</span>
                      <strong>{zoneSummary.length}</strong>
                    </div>
                    <div>
                      <span>Máxima por zona</span>
                      <strong>{zoneSummary[0]?.total ?? 0}</strong>
                    </div>
                  </div>
                )}

                <Button variant="primary" icon={<Download size={15} />} onClick={() => setSelectedReport(report.id)}>
                  {report.id === 'geral' ? 'Gerar relatório geral' : 'Gerar relatório por zona'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {selectedReport === 'geral' && reportData && (
          <Modal
            open={selectedReport === 'geral'}
            onClose={() => setSelectedReport(null)}
            title="Relatório geral"
            footer={<Button variant="secondary" onClick={() => setSelectedReport(null)}>Fechar</Button>}
          >
            <div className={s.modalContent}>
              <div className={s.summaryGrid}>
                <div className={s.summaryCard}>
                  <span>Total de cabos</span>
                  <strong>{reportData.metrics.totalCabos}</strong>
                </div>
                <div className={s.summaryCard}>
                  <span>Eleitores cadastrados</span>
                  <strong>{reportData.metrics.totalEleitores}</strong>
                </div>
                <div className={s.summaryCard}>
                  <span>Promessas concluídas</span>
                  <strong>{reportData.metrics.totalPromessasConcluidas}</strong>
                </div>
                <div className={s.summaryCard}>
                  <span>Promessas pendentes</span>
                  <strong>{reportData.metrics.totalPromessasPendentes}</strong>
                </div>
              </div>

              <div className={s.chartGrid}>
                <div className={s.chartCard}>
                  <div className={s.chartHeader}>
                    <span>Promessas</span>
                    <TrendingUp size={14} />
                  </div>
                  <div className={s.chartBars}>
                    {promiseBreakdown.map((item) => (
                      <div key={item.label} className={s.chartRow}>
                        <div className={s.rowLabelRow}>
                          <span>{item.label}</span>
                          <strong>{item.total}</strong>
                        </div>
                        <div className={s.barTrack}>
                          <div className={s.barFill} style={{ width: `${item.percentage}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={s.chartCard}>
                  <div className={s.chartHeader}>
                    <span>Zonas</span>
                    <TrendingUp size={14} />
                  </div>
                  <div className={s.chartBars}>
                    {zoneBreakdown.map((item) => (
                      <div key={item.label} className={s.chartRow}>
                        <div className={s.rowLabelRow}>
                          <span>{item.label}</span>
                          <strong>{item.total}</strong>
                        </div>
                        <div className={s.barTrack}>
                          <div className={s.barFill} style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={s.chartCard}>
                  <div className={s.chartHeader}>
                    <span>Sessões</span>
                    <TrendingUp size={14} />
                  </div>
                  <div className={s.chartBars}>
                    {sessionBreakdown.map((item) => (
                      <div key={item.label} className={s.chartRow}>
                        <div className={s.rowLabelRow}>
                          <span>{item.label}</span>
                          <strong>{item.total}</strong>
                        </div>
                        <div className={s.barTrack}>
                          <div className={s.barFill} style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={s.reportListHeader}>
                <span>Cabos eleitorais</span>
                <TrendingUp size={15} />
              </div>

              <div className={s.reportList}>
                {reportMeta?.map((item) => (
                  <div key={`${item.admin}-${item.cabo}`} className={s.reportRow}>
                    <div className={s.reportRowInfo}>
                      <div className={s.nameWithCount}>
                        <strong>{item.cabo}</strong>
                        <span className={s.rowCount}>{item.totalEleitores} eleitores</span>
                      </div>
                      <span>{item.admin} • {item.zona}</span>
                    </div>
                    <div className={s.voterList}>
                      {item.eleitores.length > 0 ? item.eleitores.map((eleitor) => (
                        <span key={`${item.cabo}-${eleitor.id ?? eleitor.nome ?? Math.random()}`} className={s.voterPill}>
                          {eleitor.nome ?? 'Eleitor sem nome'}
                        </span>
                      )) : <span className={s.emptyVoterText}>Sem eleitores cadastrados</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className={s.exportGrid}>
                <Button variant="primary" loading={reportLoading} onClick={() => void exportReport('pdf')}>Baixar PDF</Button>
                <Button variant="ghost" loading={reportLoading} onClick={() => void exportDebugPdf()}>Baixar PDF (debug)</Button>
                <Button variant="secondary" loading={reportLoading} onClick={() => void exportReport('excel')}>Baixar Excel</Button>
                <Button variant="secondary" loading={reportLoading} onClick={() => void exportReport('csv')}>Baixar CSV</Button>
              </div>
            </div>
          </Modal>
        )}

        {selectedReport === 'zona' && reportData && (
          <Modal
            open={selectedReport === 'zona'}
            onClose={() => setSelectedReport(null)}
            title="Relatório por zona"
            footer={<Button variant="secondary" onClick={() => setSelectedReport(null)}>Fechar</Button>}
          >
            <div className={s.modalContent}>
              <div className={s.summaryGrid}>
                <div className={s.summaryCard}>
                  <span>Eleitores totais</span>
                  <strong>{reportData.metrics.totalEleitores}</strong>
                </div>
                <div className={s.summaryCard}>
                  <span>Zonas cadastradas</span>
                  <strong>{zoneSummary.length}</strong>
                </div>
              </div>

              <div className={s.zoneList}>
                {zoneSummary.map((zone) => (
                  <div key={zone.zona} className={s.zoneRow}>
                    <div className={s.zoneHeader}>
                      <strong>{zone.zona}</strong>
                      <span>{zone.total} eleitores • {zone.percentage}%</span>
                    </div>
                    <div className={s.barTrack}>
                      <div className={s.barFill} style={{ width: `${Math.min(zone.percentage, 100)}%` }} />
                    </div>
                    <div className={s.zoneMeta}>
                      {zone.cabos.map(cabo => (
                        <span key={`${zone.zona}-${cabo.nome}`}>
                          {cabo.nome}: {cabo.total}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className={s.exportGrid}>
                <Button variant="primary" loading={reportLoading} onClick={() => void exportReport('pdf')}>Baixar PDF</Button>
                <Button variant="secondary" loading={reportLoading} onClick={() => void exportReport('excel')}>Baixar Excel</Button>
                <Button variant="secondary" loading={reportLoading} onClick={() => void exportReport('csv')}>Baixar CSV</Button>
              </div>
            </div>
          </Modal>
        )}
        {showDebugError && (
          <Modal
            open={showDebugError}
            onClose={() => { setShowDebugError(false); setDebugError(null); }}
            title="Erro de exportação (debug)"
            footer={<Button variant="secondary" onClick={() => { setShowDebugError(false); setDebugError(null); }}>Fechar</Button>}
          >
            <div style={{ maxHeight: '50vh', overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
              {debugError ?? 'Sem detalhes.'}
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}

export default function RelatoriosPageWithProvider() {
  return (
    <ToastProvider>
      <RelatoriosPage />
    </ToastProvider>
  );
}
