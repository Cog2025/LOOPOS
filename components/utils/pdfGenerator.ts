// File: components/utils/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { OS } from '../../types';

// Helper: Converte segundos em HH:MM:SS
const formatDuration = (seconds?: number) => {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
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
        // console.warn("Falha ao carregar imagem para PDF:", url);
        resolve(''); 
    };
  });
};

interface ReportHelpers {
  getPlantName: (id: string) => string;
  getUserName: (id: string) => string;
}

// ✅ Alterado para retornar o DOC se shouldSave for false
export const generateOSReport = async (
    osList: OS[], 
    title: string, 
    helpers: ReportHelpers, 
    shouldSave: boolean = true
): Promise<jsPDF> => {
  
  const doc = new jsPDF();
  let yPos = 15;

  // Cabeçalho do Documento
  doc.setFontSize(16); doc.text(title, 14, yPos);
  doc.setFontSize(10); doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, yPos + 6);
  yPos += 15;

  for (let i = 0; i < osList.length; i++) {
    const os = osList[i];
    if (i > 0) { doc.addPage(); yPos = 15; }

    // 1. Título da OS
    doc.setFillColor(41, 128, 185); // Azul
    doc.rect(14, yPos, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(`${os.id} - ${os.activity}`, 16, yPos + 5.5);
    yPos += 15;

    // 2. Tabela de Dados Gerais (COM TEMPO DECORRIDO)
    doc.setTextColor(0, 0, 0);
    const executionTime = formatDuration(os.executionTimeSeconds);
    
    const rows = [
      ['Status', os.status, 'Prioridade', os.priority],
      ['Início', format(new Date(os.startDate), 'dd/MM/yyyy'), 'Fim', os.endDate ? format(new Date(os.endDate), 'dd/MM/yyyy') : '-'],
      ['Técnico', helpers.getUserName(os.technicianId), 'Tempo Decorrido', executionTime],
      ['Ativo', (os as any).assetName || os.assets.join(', ') || '-', 'Usina', helpers.getPlantName(os.plantId)]
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
          yPos += 2; 
          let xImg = 20; 
          let maxH = 0;

          for (const img of itemImages) {
            if (img.url) {
              const base64 = await getImageData(img.url);
              if (base64) {
                const imgW = 30;
                const imgH = 30;
                
                if (xImg + 35 > 190) { xImg = 20; yPos += maxH + 5; maxH = 0; }
                if (yPos + 45 > 280) { doc.addPage(); yPos = 15; xImg = 20; maxH = 0; }

                doc.addImage(base64, 'JPEG', xImg, yPos, imgW, imgH);
                
                doc.setFontSize(7); doc.setFont('helvetica', 'normal');
                // Quebra nome do arquivo para não sobrepor
                const fName = doc.splitTextToSize(img.fileName || 'Foto', imgW);
                doc.text(fName, xImg, yPos + imgH + 3);

                const h = imgH + (fName.length * 3) + 5;
                if (h > maxH) maxH = h;
                xImg += 35;
              }
            }
          }
          yPos += maxH + 5; 
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
      for (const img of generalImages) {
        if (img.url) {
          const base64 = await getImageData(img.url);
          if (base64) {
             const imgW = 40;
             const imgH = 40;
             if (xImg + 45 > 190) { xImg = 14; yPos += maxH + 5; maxH = 0; }
             if (yPos + 50 > 280) { doc.addPage(); yPos = 15; xImg = 14; maxH = 0; }
             
             doc.addImage(base64, 'JPEG', xImg, yPos, imgW, imgH);
             
             doc.setFontSize(8);
             const splitN = doc.splitTextToSize(img.fileName || 'Geral', imgW);
             doc.text(splitN, xImg, yPos + 44);
             
             const h = imgH + (splitN.length * 3) + 5;
             if (h > maxH) maxH = h;
             xImg += 45;
          }
        }
      }
    }
  }

  // ✅ SÓ SALVA SE FOR TRUE, SENÃO RETORNA O DOC (PARA O ZIP)
  if (shouldSave) {
    doc.save(`${title.replace(/\s/g, '_')}.pdf`);
  }
  
  return doc;
};