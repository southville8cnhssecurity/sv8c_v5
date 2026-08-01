import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateReportPDF(title: string, data: any[], columns: string[]): void {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 35, 'F');
  
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 33, pageW, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('South Ville 8C National High School', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ID Management System', pageW / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`${title} — ${new Date().toLocaleString('en-PH')}`, pageW / 2, 30, { align: 'center' });

  autoTable(doc, {
    startY: 44,
    head: [columns],
    body: data,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22], fontStyle: 'bold', fontSize: 9, textColor: 255 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [255, 246, 240] },
    footStyles: { fillColor: [15, 23, 42], textColor: 255 },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount} — SV8CNHS ID System`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }

  doc.save(`SV8CNHS_${title.replace(/\s/g, '_')}_${Date.now()}.pdf`);
}
