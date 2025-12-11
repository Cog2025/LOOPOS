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

// Helper de Segurança para Datas
const safeFormat = (dateStr: string | undefined | null, pattern: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (!isValid(date)) return '-'; 
    return format(date, pattern);
};

// Helper: Carrega imagem URL e converte para Base64
const getImageData = (url: string): Promise<string> => {
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
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => {
        resolve(''); 
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

  // Capa / Título Principal
  doc.setFontSize(16); doc.text(title, 14, yPos);
  doc.setFontSize(10); doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, yPos + 6);
  yPos += 15;

  for (let i = 0; i < osList.length; i++) {
    const os = osList[i];
    
    // Nova página para cada OS (exceto a primeira)
    if (i > 0) { 
        doc.addPage(); 
        yPos = 15; 
    }

    // 1. Título da OS
    doc.setFillColor(41, 128, 185); // Azul
    doc.rect(14, yPos, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`${os.id} - ${os.activity}`, 16, yPos + 5.5);
    yPos += 15;

    // 2. Tabela de Dados Gerais
    doc.setTextColor(0, 0, 0);
    const executionTime = formatDuration(os.executionTimeSeconds);
    
    const rows = [
      ['Status', os.status, 'Prioridade', os.priority],
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

        const itemImages = os.imageAttachments?.filter(img => 
            img.caption && img.caption.includes(`Item ${index + 1}`)
        ) || [];
        
        if (itemImages.length > 0) {
          yPos += 5; 
          let xImg = 14; // Margem esquerda
          let maxH = 0;

          // ✅ CONFIGURAÇÃO DE TAMANHO GRANDE (Checklist)
          const imgW = 80;  // Bem maior (era 30)
          const imgH = 60;  // Bem maior (era 30)
          const gap = 10;   // Espaço entre fotos

          for (const img of itemImages) {
            if (img.url) {
              const base64 = await getImageData(img.url);
              if (base64) {
                // Se passar da margem direita (aprox 190), quebra linha
                if (xImg + imgW > 200) { 
                    xImg = 14; 
                    yPos += maxH + 10; 
                    maxH = 0; 
                }
                // Se passar do fim da página, cria nova página
                if (yPos + imgH + 10 > 280) { 
                    doc.addPage(); 
                    yPos = 15; 
                    xImg = 14; 
                    maxH = 0; 
                }

                try {
                    doc.addImage(base64, 'JPEG', xImg, yPos, imgW, imgH);
                } catch(e) { console.error(e); }
                
                doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                const fName = doc.splitTextToSize(img.fileName || 'Foto', imgW);
                doc.text(fName, xImg, yPos + imgH + 4);

                const h = imgH + (fName.length * 4) + 5;
                if (h > maxH) maxH = h;
                
                // Move X para a próxima imagem
                xImg += imgW + gap;
              }
            }
          }
          yPos += maxH + 5; // Espaço após a linha de imagens
        } else {
            yPos += 2;
        }
      }
      yPos += 5;
    }

    // 4. Fotos Gerais
    const generalImages = os.imageAttachments?.filter(img => !img.caption?.startsWith('Item ')) || [];
    if (generalImages.length > 0) {
      if (yPos > 240) { doc.addPage(); yPos = 15; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0);
      doc.text("Anexos Gerais:", 14, yPos);
      yPos += 10;

      let xImg = 14;
      let maxH = 0;
      
      // ✅ CONFIGURAÇÃO DE TAMANHO GRANDE (Gerais)
      const imgW = 85; // Ocupa quase metade da página
      const imgH = 65; 
      const gap = 10;

      for (const img of generalImages) {
        if (img.url) {
          const base64 = await getImageData(img.url);
          if (base64) {
             // Quebra de linha (Grid de 2 colunas)
             if (xImg + imgW > 200) { 
                 xImg = 14; 
                 yPos += maxH + 10; 
                 maxH = 0; 
             }
             // Quebra de página
             if (yPos + imgH + 10 > 280) { 
                 doc.addPage(); 
                 yPos = 15; 
                 xImg = 14; 
                 maxH = 0; 
             }
             
             try {
                doc.addImage(base64, 'JPEG', xImg, yPos, imgW, imgH);
             } catch (e) { console.error(e); }
             
             doc.setFontSize(9);
             const splitN = doc.splitTextToSize(img.fileName || 'Geral', imgW);
             doc.text(splitN, xImg, yPos + imgH + 4);
             
             const h = imgH + (splitN.length * 4) + 5;
             if (h > maxH) maxH = h;
             
             xImg += imgW + gap;
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