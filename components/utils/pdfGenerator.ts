// File: components/utils/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isValid } from 'date-fns';
import { OS, PlantMaintenancePlan, TaskTemplate } from '../../types';

// 🔥 DEFINIÇÃO DO SERVIDOR
const API_BASE = 'http://192.168.18.165:8000';

// --- HELPERS ---

const resolveAssetUrl = (u?: string) => {
    if (!u) return '';
    if (u.startsWith('data:')) return u;
    
    // Remove espaços extras que podem quebrar a URL
    let cleanPath = u.trim();

    // Se já for absoluta (http/https), retorna codificada
    if (cleanPath.startsWith('http')) {
        return encodeURI(cleanPath);
    }
    
    // Garante que começa com /
    if (!cleanPath.startsWith('/')) {
        cleanPath = `/${cleanPath}`;
    }

    // Monta a URL e codifica apenas a parte do caminho/arquivo
    // (Evita codificar os :// do http)
    const fullUrl = `${API_BASE}${cleanPath}`;
    return encodeURI(fullUrl);
};

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

const formatDuration = (seconds?: number) => {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

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

    // 🔥 LOG DE ERRO PARA DEBUG NO CELULAR
    img.onerror = () => {
        console.warn(`❌ [PDF] Erro ao baixar imagem: ${url}`);
        resolve(null);
    };
  });
};

interface ReportHelpers {
  getPlantName: (id: string) => string;
  getUserName: (id: string) => string;
}

const ASSET_COLORS = [
    [41, 128, 185],  // Azul
    [39, 174, 96],   // Verde
    [192, 57, 43],   // Vermelho
    [230, 126, 34],  // Laranja
    [142, 68, 173],  // Roxo
    [44, 62, 80],    // Cinza Escuro
    [211, 84, 0],    // Abóbora
    [22, 160, 133],  // Verde Mar
];

// --- 1. RELATÓRIO COMPLETO DE MANUTENÇÃO (PLANOS) ---
export const generateFullMaintenancePDF = (
  items: (PlantMaintenancePlan | TaskTemplate)[], 
  title: string,
  subTitle: string = '',
  shouldSave: boolean = true 
): jsPDF => { 
  const doc = new jsPDF({ orientation: 'landscape' });
  const now = format(new Date(), 'dd/MM/yyyy HH:mm');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${subTitle}`, 14, 28);
  doc.text(`Gerado em: ${now} | Total de Tarefas: ${items.length}`, 14, 34);

  doc.setDrawColor(200);
  doc.line(14, 38, 280, 38);

  const groupedItems: Record<string, typeof items> = {};
  items.forEach(item => {
      const asset = item.asset_category || 'Geral';
      if (!groupedItems[asset]) groupedItems[asset] = [];
      groupedItems[asset].push(item);
  });

  const sortedAssets = Object.keys(groupedItems).sort();

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("Sumário do Plano", 14, 50);
  
  let yPos = 60;
  doc.setFontSize(10);
  
  sortedAssets.forEach((asset, index) => {
      if (yPos > 190) {
          doc.addPage();
          yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${asset} (${groupedItems[asset].length} tarefas)`, 14, yPos);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      groupedItems[asset].forEach(task => {
          if (yPos > 190) { doc.addPage(); yPos = 20; }
          const cleanTitle = task.title.length > 90 ? task.title.substring(0, 90) + '...' : task.title;
          doc.text(`- ${cleanTitle}`, 20, yPos);
          yPos += 5;
      });
      yPos += 4; 
      doc.setTextColor(0);
  });

  doc.addPage();
  
  sortedAssets.forEach((asset, index) => {
      const tasks = groupedItems[asset];
      const color = ASSET_COLORS[index % ASSET_COLORS.length] as [number, number, number];

      const finalY = (doc as any).lastAutoTable?.finalY || 15;
      let titleY = finalY + 15;
      
      if (titleY > 180) {
          doc.addPage();
          titleY = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(`${asset.toUpperCase()}`, 14, titleY);

      const tableBody = tasks.map(item => {
        const subtasksText = item.subtasks && item.subtasks.length > 0
          ? item.subtasks.map((s, i) => `${i + 1}) ${s}`).join('\n')
          : '-';

        const duration = formatMinutes(item.estimated_duration_minutes);
        const downtime = item.planned_downtime_minutes 
          ? formatMinutes(item.planned_downtime_minutes)
          : '-';

        return [
          item.title,
          subtasksText,
          item.task_type || '-',
          getFrequencyLabel(item.frequency_days),
          duration,
          downtime,
          item.criticality || '-',
          item.classification1 || '-',
          item.classification2 || '-'
        ];
      });

      autoTable(doc, {
        startY: titleY + 5,
        head: [[
          'Tarefa', 
          'Checklist (Subtarefas)', 
          'Tipo', 
          'Freq.', 
          'Duração', 
          'Inativ.',
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
          fillColor: color,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 80 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 20, halign: 'center' },
          7: { cellWidth: 25 },
          8: { cellWidth: 25 }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 6) { 
                const val = String(data.cell.raw).toLowerCase();
                if (val.includes('alta') || val.includes('urgente')) {
                    data.cell.styles.textColor = [220, 53, 69];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
      });
  });

  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
  }

  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  if (shouldSave) {
    doc.save(`${safeTitle}.pdf`);
  }
  
  return doc; 
};

// --- 2. RELATÓRIO DE ORDEM DE SERVIÇO (DETALHADO E COMPLETOS) ---
export const generateOSReport = async (
    osList: OS[], 
    title: string, 
    helpers: ReportHelpers, 
    shouldSave: boolean = true 
): Promise<jsPDF> => { 
  
  const doc = new jsPDF();
  let yPos = 15;

  const printSingleOS = async (os: OS) => {
      doc.setFontSize(16); 
      doc.setTextColor(0);
      doc.text(title, 14, 15);
      doc.setFontSize(10); 
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 21);
      yPos = 30;

      // Barra de Título
      doc.setFillColor(41, 128, 185);
      doc.rect(14, yPos, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text(`${os.id} - ${os.activity}`, 16, yPos + 5.5);
      yPos += 15;

      // Tabela de Detalhes
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

      // Descrição
      if (os.description) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
          doc.text('Descrição / Instruções:', 14, yPos);
          doc.setFont('helvetica', 'normal');
          const splitDesc = doc.splitTextToSize(os.description, 180);
          doc.text(splitDesc, 14, yPos + 5);
          yPos += (splitDesc.length * 5) + 10;
      }

      // Checklist e Evidências
      if (os.subtasksStatus && os.subtasksStatus.length > 0) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text("Checklist Detalhado e Evidências:", 14, yPos);
        yPos += 8;

        for (const [index, item] of os.subtasksStatus.entries()) {
          if (yPos > 260) { doc.addPage(); yPos = 20; }

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

          // Busca imagens deste item
          const itemImages = os.imageAttachments?.filter(img => 
              img.caption && img.caption.includes(`Item ${index + 1}`)
          ) || [];
          
          if (itemImages.length > 0) {
            yPos += 2; 
            const maxImgWidth = 80;  
            const maxImgHeight = 60; 
            const gap = 10;
            let xImg = 14;
            let maxRowHeight = 0; 

            for (const img of itemImages) {
              if (img.url) {
                // 🔥 LOG DE DEBUG PARA URL DA IMAGEM
                const fullUrl = resolveAssetUrl(img.url);
                console.log(`📷 Tentando baixar: ${fullUrl}`);

                const imgData = await getImageData(fullUrl);
                
                if (imgData) {
                  if (xImg + maxImgWidth > 200) { xImg = 14; yPos += maxRowHeight + 10; maxRowHeight = 0; }
                  if (yPos + maxImgHeight + 10 > 280) { doc.addPage(); yPos = 20; xImg = 14; maxRowHeight = 0; }
                  
                  const ratio = Math.min(maxImgWidth / imgData.width, maxImgHeight / imgData.height);
                  const finalW = imgData.width * ratio;
                  const finalH = imgData.height * ratio;
                  const offsetX = xImg + (maxImgWidth - finalW) / 2;
                  
                  try { doc.addImage(imgData.base64, 'JPEG', offsetX, yPos, finalW, finalH); } catch(e) { console.error(e); }
                  
                  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
                  const fName = doc.splitTextToSize(img.fileName || 'Foto', maxImgWidth);
                  doc.text(fName, xImg, yPos + maxImgHeight + 4);

                  const totalH = maxImgHeight + (fName.length * 3) + 5;
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

      // Fotos Gerais
      const generalImages = os.imageAttachments?.filter(img => !img.caption?.startsWith('Item ')) || [];
      if (generalImages.length > 0) {
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0);
        doc.text("Anexos Gerais:", 14, yPos);
        yPos += 8;

        const maxImgWidth = 85; const maxImgHeight = 65; const gap = 10; let xImg = 14; let maxRowHeight = 0;
        for (const img of generalImages) {
          if (img.url) {
            const fullUrl = resolveAssetUrl(img.url);
            console.log(`📷 Tentando baixar Geral: ${fullUrl}`); // Log

            const imgData = await getImageData(fullUrl);
            
            if (imgData) {
               if (xImg + maxImgWidth > 200) { xImg = 14; yPos += maxRowHeight + 10; maxRowHeight = 0; }
               if (yPos + maxImgHeight + 10 > 280) { doc.addPage(); yPos = 20; xImg = 14; maxRowHeight = 0; }
               
               const ratio = Math.min(maxImgWidth / imgData.width, maxImgHeight / imgData.height);
               const finalW = imgData.width * ratio;
               const finalH = imgData.height * ratio;
               const offsetX = xImg + (maxImgWidth - finalW) / 2;
               
               try { doc.addImage(imgData.base64, 'JPEG', offsetX, yPos, finalW, finalH); } catch (e) { console.error(e); }
               
               doc.setFontSize(8);
               const splitN = doc.splitTextToSize(img.fileName || 'Geral', maxImgWidth);
               doc.text(splitN, xImg, yPos + maxImgHeight + 4);
               
               const totalH = maxImgHeight + (splitN.length * 3) + 5;
               if (totalH > maxRowHeight) maxRowHeight = totalH;
               
               xImg += maxImgWidth + gap;
            }
          }
        }
      }
  };

  for (let i = 0; i < osList.length; i++) {
      if (i > 0) doc.addPage();
      await printSingleOS(osList[i]);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Pág ${i}/${totalPages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
  }

  if (shouldSave) {
    doc.save(`${title.replace(/\s/g, '_')}.pdf`);
  }
  
  return doc; 
};