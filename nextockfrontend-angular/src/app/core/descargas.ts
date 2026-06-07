// Utilidades para descargar reportes en CSV (HU-13), Excel (HU-16) y PDF (HU-13).
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Columna { key: string; label: string; }

function valores(columnas: Columna[], filas: any[]): any[][] {
  return filas.map((f) => columnas.map((c) => f[c.key] ?? ''));
}

/** Descarga CSV (HU-13). */
export function descargarCsv(nombre: string, columnas: Columna[], filas: any[]) {
  const esc = (v: any) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [columnas.map((c) => esc(c.label)).join(',')];
  for (const f of filas) lineas.push(columnas.map((c) => esc(f[c.key])).join(','));
  const blob = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  bajar(blob, `${nombre}.csv`);
}

/** Descarga Excel .xlsx (HU-16). */
export function descargarExcel(nombre: string, hoja: string, columnas: Columna[], filas: any[]) {
  const aoa = [columnas.map((c) => c.label), ...valores(columnas, filas)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31));
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

/** Descarga PDF (HU-13). */
export function descargarPdf(nombre: string, titulo: string, columnas: Columna[], filas: any[]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.setTextColor(28, 93, 87);
  doc.text(titulo, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('NEXTOCK · generado el ' + new Date().toLocaleString(), 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [columnas.map((c) => c.label)],
    body: valores(columnas, filas),
    headStyles: { fillColor: [28, 93, 87] },
    styles: { fontSize: 8 },
  });
  doc.save(`${nombre}.pdf`);
}

function bajar(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
