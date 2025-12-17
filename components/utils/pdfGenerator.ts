// File: components/utils/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isValid } from 'date-fns';
import { OS, PlantMaintenancePlan, TaskTemplate } from '../../types';

// --- HELPERS (Funções auxiliares) ---

// Helper: Converte frequência (dias) em texto legível
const getFrequencyLabel = (days: number): string => {
  if (!days) return '-';
  if (days === 1) return 'Diário';
  if (days === 7) return 'Semanal';
  if (days === 15) return 'Quinzenal';
  if (days === 30) return 'Mensal';
  if (days === 60) return 'Bimestral';
  if (days === 90) return 'Trimestral';
  if (days === 180) return 'Semestral';
  if (days === 365) return 'Anual';
  return `${days} Dias`;
};

// Helper: Converte segundos em HH:MM:SS (usado nas OSs)
const formatDuration = (seconds?: number) => {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// Helper: Converte minutos em texto curto (usado no Plano)
const formatMinutes = (mins?: number) => {
    if (!mins) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const safeFormat = (dateStr: string | undefined | null, pattern: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (!isValid(date)) return '-'; 
    return format(date, pattern);
};

// Helper para imagens com dimensões (usado no relatório de OS)
interface ImageData {
    base64: string;
    width: number;
    height: number;
}

const getImageData = (url: string): Promise<ImageData | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve({
          base64: canvas.toDataURL('image/jpeg'),
          width: img.width,
          height: img.height
      });
    };
    img.onerror = () => resolve(null);
  });
};

interface ReportHelpers {
  getPlantName: (id: string) => string;
  getUserName: (id: string) => string;
}

// --- 1. RELATÓRIO COMPLETO DE MANUTENÇÃO (PLANOS E BIBLIOTECA) ---
// Substitui e aprimora a antiga generateMaintenancePlanReport
export const generateFullMaintenancePDF = (
  items: (PlantMaintenancePlan | TaskTemplate)[], 
  title: string,
  subTitle: string = ''
) => {
  // Configura PDF em Paisagem (landscape) para caber todas as colunas
  const doc = new jsPDF({ orientation: 'landscape' });

  // Cabeçalho
  const now = format(new Date(), 'dd/MM/yyyy HH:mm');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${subTitle} - Gerado em: ${now}`, 14, 22);
  doc.text(`Total de Tarefas: ${items.length}`, 200, 22);

  // Ordenação: Categoria (Ativo) -> Título da Tarefa
  const sortedItems = [...items].sort((a, b) => {
    const catA = (a.asset_category || '').toLowerCase();
    const catB = (b.asset_category || '').toLowerCase();
    if (catA === catB) {
      return (a.title || '').localeCompare(b.title || '');
    }
    return catA.localeCompare(catB);
  });

  const tableBody = sortedItems.map(item => {
    // ✅ Formata subtarefas numeradas: 1) ... 2) ...
    const subtasksText = item.subtasks && item.subtasks.length > 0
      ? item.subtasks.map((s, i) => `${i + 1}) ${s}`).join('\n')
      : '-';

    // Duração (vem em minutos)
    const duration = formatMinutes(item.estimated_duration_minutes);

    return [
      item.asset_category || 'Geral',        // 0. Ativo
      item.title,                            // 1. Tarefa
      subtasksText,                          // 2. Checklist (Numerado)
      item.task_type || '-',                 // 3. Tipo
      getFrequencyLabel(item.frequency_days),// 4. Frequência
      duration,                              // 5. Duração
      item.criticality || '-',               // 6. Criticidade
      item.classification1 || '-',           // 7. Classif. 1
      item.classification2 || '-'            // 8. Classif. 2
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [[
      'Ativo / Sistema', 
      'Tarefa', 
      'Checklist (Subtarefas)', 
      'Tipo', 
      'Freq.', 
      'Duração', 
      'Critic.', 
      'Class. 1', 
      'Class. 2'
    ]],
    body: tableBody,
    styles: { 
      fontSize: 8,           
      cellPadding: 3,
      valign: 'top',         
      overflow: 'linebreak'  
    },
    headStyles: {
      fillColor: [41, 128, 185], // Azul
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' }, // Ativo
      1: { cellWidth: 35, fontStyle: 'bold' }, // Tarefa
      2: { cellWidth: 80 },                    // Checklist (Largo)
      3: { cellWidth: 20 },                    // Tipo
      4: { cellWidth: 20, halign: 'center' },  // Frequência
      5: { cellWidth: 15, halign: 'center' },  // Duração
      6: { cellWidth: 18, halign: 'center' },  // Criticidade
      7: { cellWidth: 25 },                    // Class 1
      8: { cellWidth: 25 }                     // Class 2
    },
    // Estilização condicional para Criticidade (Vermelho se for Alta)
    didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) { 
            const val = String(data.cell.raw).toLowerCase();
            if (val.includes('alta') || val.includes('urgente')) {
                data.cell.styles.textColor = [220, 53, 69];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${pageCount}`, 
        doc.internal.pageSize.width - 20, 
        doc.internal.pageSize.height - 10
      );
    }
  });

  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${safeTitle}.pdf`);
};

// --- 2. RELATÓRIO DE ORDEM DE SERVIÇO (ORIGINAL/MANTIDO) ---
export const generateOSReport = async (
    osList: OS[], 
    title: string, 
    helpers: ReportHelpers, 
    shouldSave: boolean = true
): Promise<jsPDF> => {
  
  const doc = new jsPDF();
  let yPos = 15;

  doc.setFontSize(16); doc.text(title, 14, yPos);
  doc.setFontSize(10); doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, yPos + 6);
  yPos += 15;

  for (let i = 0; i < osList.length; i++) {
    const os = osList[i];
    
    if (i > 0) { 
        doc.addPage(); 
        yPos = 15; 
    }

    if (osList.length === 1) {
        // DETALHADO (1 OS)
        doc.setFillColor(41, 128, 185);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`${os.id} - ${os.activity}`, 16, yPos + 5.5);
        yPos += 15;

        doc.setTextColor(0, 0, 0);
        const executionTime = formatDuration(os.executionTimeSeconds);
        const displayStatus = os.status === 'Em Progresso' ? 'Em Execução' : os.status;

        const rows = [
          ['Status', displayStatus, 'Prioridade', os.priority],
          ['Início', safeFormat(os.startDate, 'dd/MM/yyyy'), 'Fim', safeFormat(os.endDate, 'dd/MM/yyyy')],
          ['Técnico', helpers.getUserName(os.technicianId || ''), 'Tempo Decorrido', executionTime],
          ['Ativo', (os as any).assetName || os.assets?.join(', ') || '-', 'Usina', helpers.getPlantName(os.plantId)],
          ['Auxiliar', helpers.getUserName(os.assistantId || ''), 'Classificação', `${os.classification1 || '-'} / ${os.classification2 || '-'}`]
        ];

        autoTable(doc, {
          startY: yPos,
          head: [['Campo', 'Valor', 'Campo', 'Valor']],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [220, 220, 220], textColor: 0 },
          styles: { fontSize: 9, cellPadding: 1.5 },
          margin: { left: 14, right: 14 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;

        if (os.description) {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
            doc.text('Descrição / Instruções:', 14, yPos);
            doc.setFont('helvetica', 'normal');
            const splitDesc = doc.splitTextToSize(os.description, 180);
            doc.text(splitDesc, 14, yPos + 5);
            yPos += (splitDesc.length * 5) + 10;
        }

        if (os.subtasksStatus && os.subtasksStatus.length > 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
          doc.text("Checklist Detalhado e Evidências:", 14, yPos);
          yPos += 8;

          for (const [index, item] of os.subtasksStatus.entries()) {
            if (yPos > 260) { doc.addPage(); yPos = 15; }

            doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
            const statusIcon = item.done ? '[OK]' : '[  ]';
            const taskText = `${index + 1}. ${statusIcon} ${item.text}`;
            const splitTitle = doc.splitTextToSize(taskText, 180);
            doc.text(splitTitle, 14, yPos);
            yPos += (splitTitle.length * 5) + 1;

            if (item.comment) {
              doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(80);
              const splitComment = doc.splitTextToSize(`Obs: ${item.comment}`, 170);
              doc.text(splitComment, 20, yPos);
              doc.setTextColor(0);
              yPos += (splitComment.length * 4) + 2;
            }

            const itemImages = os.imageAttachments?.filter(img => 
                img.caption && img.caption.includes(`Item ${index + 1}`)
            ) || [];
            
            if (itemImages.length > 0) {
              yPos += 5; 
              const maxImgWidth = 80;  
              const maxImgHeight = 60; 
              const gap = 10;
              let xImg = 14;
              let maxRowHeight = 0; 

              for (const img of itemImages) {
                if (img.url) {
                  const imgData = await getImageData(img.url);
                  if (imgData) {
                    if (xImg + maxImgWidth > 200) { 
                        xImg = 14; 
                        yPos += maxRowHeight + 15; 
                        maxRowHeight = 0; 
                    }
                    if (yPos + maxImgHeight + 10 > 280) { 
                        doc.addPage(); 
                        yPos = 15; 
                        xImg = 14; 
                        maxRowHeight = 0; 
                    }
                    const ratio = Math.min(maxImgWidth / imgData.width, maxImgHeight / imgData.height);
                    const finalW = imgData.width * ratio;
                    const finalH = imgData.height * ratio;
                    const offsetX = xImg + (maxImgWidth - finalW) / 2;
                    try {
                        doc.addImage(imgData.base64, 'JPEG', offsetX, yPos, finalW, finalH);
                    } catch(e) { console.error(e); }
                    
                    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                    const fName = doc.splitTextToSize(img.fileName || 'Foto', maxImgWidth);
                    doc.text(fName, xImg, yPos + maxImgHeight + 4);

                    const totalH = maxImgHeight + (fName.length * 4) + 5;
                    if (totalH > maxRowHeight) maxRowHeight = totalH;
                    
                    xImg += maxImgWidth + gap;
                  }
                }
              }
              yPos += maxRowHeight + 5; 
            } else {
                yPos += 2;
            }
          }
          yPos += 5;
        }

        const generalImages = os.imageAttachments?.filter(img => !img.caption?.startsWith('Item ')) || [];
        if (generalImages.length > 0) {
          if (yPos > 240) { doc.addPage(); yPos = 15; }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0);
          doc.text("Anexos Gerais:", 14, yPos);
          yPos += 10;

          const maxImgWidth = 85; 
          const maxImgHeight = 65; 
          const gap = 10;
          let xImg = 14;
          let maxRowHeight = 0;

          for (const img of generalImages) {
            if (img.url) {
              const imgData = await getImageData(img.url);
              if (imgData) {
                 if (xImg + maxImgWidth > 200) { 
                     xImg = 14; 
                     yPos += maxRowHeight + 15; 
                     maxRowHeight = 0; 
                 }
                 if (yPos + maxImgHeight + 10 > 280) { 
                     doc.addPage(); 
                     yPos = 15; 
                     xImg = 14; 
                     maxRowHeight = 0; 
                 }
                 const ratio = Math.min(maxImgWidth / imgData.width, maxImgHeight / imgData.height);
                 const finalW = imgData.width * ratio;
                 const finalH = imgData.height * ratio;
                 const offsetX = xImg + (maxImgWidth - finalW) / 2;
                 try {
                    doc.addImage(imgData.base64, 'JPEG', offsetX, yPos, finalW, finalH);
                 } catch (e) { console.error(e); }
                 
                 doc.setFontSize(9);
                 const splitN = doc.splitTextToSize(img.fileName || 'Geral', maxImgWidth);
                 doc.text(splitN, xImg, yPos + maxImgHeight + 4);
                 
                 const totalH = maxImgHeight + (splitN.length * 4) + 5;
                 if (totalH > maxRowHeight) maxRowHeight = totalH;
                 
                 xImg += maxImgWidth + gap;
              }
            }
          }
        }
    } else {
        // LISTAGEM (Múltiplas OSs)
        doc.setFillColor(41, 128, 185);
        doc.rect(14, yPos, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`Listagem de OSs (${osList.length})`, 16, yPos + 5.5);
        yPos += 15;

        doc.setTextColor(0, 0, 0);
        const rows = osList.map(os => [
            os.id,
            safeFormat(os.startDate, 'dd/MM/yyyy'),
            helpers.getPlantName(os.plantId),
            os.activity,
            helpers.getUserName(os.technicianId || ''),
            os.status
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['ID', 'Data', 'Usina', 'Atividade', 'Técnico', 'Status']],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 }
        });
    }
  }

  if (shouldSave) {
    doc.save(`${title.replace(/\s/g, '_')}.pdf`);
  }
  
  return doc;
};