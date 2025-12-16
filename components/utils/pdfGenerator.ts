// File: components/utils/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isValid } from 'date-fns';
import { OS } from '../../types';

// Helper: Converte segundos em HH:MM:SS
const formatDuration = (seconds?: number) => {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const safeFormat = (dateStr: string | undefined | null, pattern: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (!isValid(date)) return '-'; 
    return format(date, pattern);
};

// ✅ HELPER MELHORADO: Retorna Base64 E as dimensões originais
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
    img.onerror = () => {
        resolve(null); 
    };
  });
};

interface ReportHelpers {
  getPlantName: (id: string) => string;
  getUserName: (id: string) => string;
}

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

    // 1. Título
    doc.setFillColor(41, 128, 185);
    doc.rect(14, yPos, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`${os.id} - ${os.activity}`, 16, yPos + 5.5);
    yPos += 15;

    // 2. Dados Gerais
    doc.setTextColor(0, 0, 0);
    const executionTime = formatDuration(os.executionTimeSeconds);
    
    // ✅ CORREÇÃO DE STATUS: "Em Progresso" -> "Em Execução"
    const displayStatus = os.status === 'Em Progresso' ? 'Em Execução' : os.status;

    const rows = [
      ['Status', displayStatus, 'Prioridade', os.priority],
      ['Início', safeFormat(os.startDate, 'dd/MM/yyyy'), 'Fim', safeFormat(os.endDate, 'dd/MM/yyyy')],
      ['Técnico', helpers.getUserName(os.technicianId), 'Tempo Decorrido', executionTime],
      ['Ativo', (os as any).assetName || os.assets?.join(', ') || '-', 'Usina', helpers.getPlantName(os.plantId)]
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

    // 3. Subtarefas e Evidências
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

        // Fotos do Item
        const itemImages = os.imageAttachments?.filter(img => 
            img.caption && img.caption.includes(`Item ${index + 1}`)
        ) || [];
        
        if (itemImages.length > 0) {
          yPos += 5; 
          
          // ✅ CONFIGURAÇÃO DE LAYOUT ADAPTÁVEL
          const maxImgWidth = 80;  // Largura máxima da caixa
          const maxImgHeight = 60; // Altura máxima da caixa
          const gap = 10;
          let xImg = 14;
          let maxRowHeight = 0; // Altura da maior imagem na linha atual

          for (const img of itemImages) {
            if (img.url) {
              const imgData = await getImageData(img.url);
              if (imgData) {
                // Quebra de linha se passar da margem
                if (xImg + maxImgWidth > 200) { 
                    xImg = 14; 
                    yPos += maxRowHeight + 15; // Espaço para imagem + legenda
                    maxRowHeight = 0; 
                }
                // Quebra de página
                if (yPos + maxImgHeight + 10 > 280) { 
                    doc.addPage(); 
                    yPos = 15; 
                    xImg = 14; 
                    maxRowHeight = 0; 
                }

                // ✅ CÁLCULO DE PROPORÇÃO (ASPECT RATIO)
                const ratio = Math.min(maxImgWidth / imgData.width, maxImgHeight / imgData.height);
                const finalW = imgData.width * ratio;
                const finalH = imgData.height * ratio;

                // Centralizar a imagem na "caixa" imaginária de 80x60
                const offsetX = xImg + (maxImgWidth - finalW) / 2;
                
                try {
                    doc.addImage(imgData.base64, 'JPEG', offsetX, yPos, finalW, finalH);
                } catch(e) { console.error(e); }
                
                // Legenda centralizada abaixo da caixa
                doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                const fName = doc.splitTextToSize(img.fileName || 'Foto', maxImgWidth);
                doc.text(fName, xImg, yPos + maxImgHeight + 4); // Posição fixa abaixo da "caixa"

                // Calcula altura total usada (Caixa da imagem + Texto)
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

    // 4. Fotos Gerais (Lógica Adaptável Igual)
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
             
             // ✅ CÁLCULO DE PROPORÇÃO
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
  }

  if (shouldSave) {
    doc.save(`${title.replace(/\s/g, '_')}.pdf`);
  }
  
  return doc;
};