// src/lib/relatorios.js — Relatório de treinamento (OJT) dos colaboradores,
// exportável em CSV (Excel) e PDF. Mantido separado de db.js/pdf.js pra não
// misturar "dados" com "documento gerado no navegador".
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { unitById, fmtDate, today } from "../utils";

const WLM = [0, 219, 129];
const INK = [26, 32, 41];

// padrões treinados de um colaborador, ordenados por nome — [ [padrao, data], ... ]
const treinosDe = (c) => Object.entries(c.treinamentos || {}).sort((a, b) => a[0].localeCompare(b[0]));

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomeArquivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// escapa um campo pro CSV com separador ";" (aspas quando o valor tem ; " ou quebra de linha)
function csvCell(v) {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportarTreinamentosCSV(colaboradores, units) {
  const linhas = [["Casa", "Colaborador", "Cargo", "Departamento", "Padrão", "Data do treinamento"]];
  colaboradores.forEach((c) => {
    const casa = unitById(c.unidadeId, units)?.nome || "—";
    const base = [casa, c.nome, c.cargo || "—", c.departamento || "—"];
    const treinos = treinosDe(c);
    if (!treinos.length) {
      linhas.push([...base, "", "Sem treinamentos registrados"]);
    } else {
      treinos.forEach(([padrao, data]) => linhas.push([...base, padrao, fmtDate(data)]));
    }
  });
  const csv = linhas.map((l) => l.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  baixarBlob(blob, `treinamentos-${today()}.csv`);
}

export function exportarTreinamentosPDF(colaboradores, units) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 42;

  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...INK);
  doc.text("Relatório de Treinamento — WLM", W - 40, y + 8, { align: "right" });
  y += 24;
  doc.setDrawColor(...WLM); doc.setLineWidth(2.5); doc.line(40, y, W - 40, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Emitido em ${fmtDate(today())} · ${colaboradores.length} colaborador(es)`, 40, y); y += 16;

  colaboradores.forEach((c) => {
    const casa = unitById(c.unidadeId, units)?.nome || "—";
    const treinos = treinosDe(c);
    const alturaEstimativa = 40 + (treinos.length ? treinos.length * 16 + 24 : 18);
    if (y + alturaEstimativa > H - 40) { doc.addPage(); y = 42; }

    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(c.nome, 40, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`${c.cargo || "—"} · ${c.departamento || "—"} · ${casa}`, 40, y); y += 10;

    if (!treinos.length) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(150);
      doc.text("Sem treinamentos registrados.", 40, y + 10);
      y += 26;
    } else {
      autoTable(doc, {
        startY: y + 6,
        head: [["Padrão", "Data do treinamento"]],
        body: treinos.map(([padrao, data]) => [padrao, fmtDate(data)]),
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: INK, textColor: 255, fontSize: 8.5 },
        columnStyles: { 1: { cellWidth: 110 } },
        margin: { left: 40, right: 40 },
      });
      y = doc.lastAutoTable.finalY + 18;
    }
  });

  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150);
    doc.text("WLM · Relatório de Treinamento", 40, H - 20);
    doc.text(`Página ${p}/${pages}`, W - 40, H - 20, { align: "right" });
  }

  doc.save(`treinamentos-${today()}.pdf`);
}
