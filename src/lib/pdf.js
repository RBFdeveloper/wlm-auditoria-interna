// src/lib/pdf.js — Relatório de auditoria em PDF (jsPDF + autotable)
// npm install jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const WLM = [0, 219, 129];
const INK = [26, 32, 41];
const RED = [214, 69, 69];
const GREEN = [46, 158, 107];

const fmt = (d) => { if (!d) return "—"; const [y, m, dd] = String(d).split("-"); return `${dd}/${m}/${y}`; };
const resLabel = { conforme: "Conforme", nao_conforme: "Não conforme", na: "N/A", pendente: "Pendente", atende: "Atende", nao_atende: "Não atende" };
const sevLabel = { baixa: "Baixa", media: "Média", alta: "Alta" };
const stLabel = { aberta: "Aberta", em_tratamento: "Em tratamento", resolvida: "Resolvida" };

export function gerarRelatorioPDF({ audit, ncs = [], colaboradores = [], unidadeNome = "—", logo = null }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 42;

  // cabeçalho
  if (logo) { try { doc.addImage(logo, "PNG", 40, y - 6, 66, 21); } catch (e) {} }
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...INK);
  doc.text("Relatório de Diagnóstico", W - 40, y + 8, { align: "right" });
  y += 24;
  doc.setDrawColor(...WLM); doc.setLineWidth(2.5); doc.line(40, y, W - 40, y); y += 18;

  // métricas
  const av = audit.itens.filter((i) => i.resultado === "conforme" || i.resultado === "nao_conforme");
  const taxa = av.length ? Math.round((av.filter((i) => i.resultado === "conforme").length / av.length) * 100) : 0;
  const ncCount = audit.itens.filter((i) => i.resultado === "nao_conforme").length;

  autoTable(doc, {
    startY: y, theme: "plain",
    body: [
      ["Código", audit.codigoFmt || "—", "Tema", audit.tipo],
      ["Casa", unidadeNome, "Setor", audit.setor],
      ["Data", fmt(audit.data), "Auditor", audit.auditor || "—"],
      ...(audit.departamento || audit.responsavelNome
        ? [["Departamento", audit.departamento || "—", "Responsável", audit.responsavelNome || "—"]] : []),
      ...(audit.tipo === "OPEG"
        ? [["Pontuação", audit.pontuacao != null ? `${audit.pontuacao} pts` : "—", "Classificação", audit.classificacao || "—"]]
        : [["Conformidade", `${taxa}%`, "Não conformidades", String(ncCount)]]),
    ],
    styles: { fontSize: 9.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: INK, cellWidth: 90 }, 1: { textColor: [70, 70, 70], cellWidth: 170 },
      2: { fontStyle: "bold", textColor: INK, cellWidth: 110 }, 3: { textColor: [70, 70, 70] },
    },
  });
  y = doc.lastAutoTable.finalY + 16;

  // itens — agrupa por sujeito quando aplicável
  const porSujeito = audit.modo === "funcionario" || audit.modo === "processo";
  const subj = (i) => audit.modo === "funcionario"
    ? (colaboradores.find((c) => c.id === i.colaboradorId)?.nome || "Colaborador")
    : (i.processo || "—");

  const tabelaItens = (titulo, itens) => {
    if (y > H - 90) { doc.addPage(); y = 42; }
    if (titulo) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...INK);
      doc.text(titulo, 40, y); y += 4;
    }
    autoTable(doc, {
      startY: y + 4,
      head: [["Área", "Cód", "Requisito", "Resultado", "Observação"]],
      body: itens.map((i) => [i.area, i.codigo, i.requisito, resLabel[i.resultado] || i.resultado, i.obs || ""]),
      styles: { fontSize: 8, cellPadding: 3, valign: "top" },
      headStyles: { fillColor: INK, textColor: 255, fontSize: 8 },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 32 }, 2: { cellWidth: 165 }, 3: { cellWidth: 70 }, 4: { cellWidth: 120 } },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 3) {
          if (d.cell.raw === "Não conforme" || d.cell.raw === "Não atende") d.cell.styles.textColor = RED;
          else if (d.cell.raw === "Conforme" || d.cell.raw === "Atende") d.cell.styles.textColor = GREEN;
        }
      },
    });
    y = doc.lastAutoTable.finalY + 14;
  };

  if (porSujeito) {
    const keys = [...new Set(audit.itens.map(subj))];
    keys.forEach((k) => tabelaItens(`${audit.modo === "funcionario" ? "Colaborador" : "Processo"}: ${k}`, audit.itens.filter((i) => subj(i) === k)));
  } else {
    tabelaItens(null, audit.itens);
  }

  // não conformidades + planos de ação
  const ncList = ncs.filter((n) => n.auditoriaId === audit.id);
  if (ncList.length) {
    if (y > H - 110) { doc.addPage(); y = 42; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(...RED);
    doc.text("Não conformidades e planos de ação", 40, y); y += 4;
    autoTable(doc, {
      startY: y + 6,
      head: [["Cód", "Requisito", "Descrição", "Sev.", "Status", "Responsável", "Prazo", "Plano de ação"]],
      body: ncList.map((n) => [n.codigo, n.requisito, n.descricao, sevLabel[n.severidade] || n.severidade,
        stLabel[n.status] || n.status, n.responsavel || "—", fmt(n.prazo), n.planoAcao || "—"]),
      styles: { fontSize: 7, cellPadding: 2.5, valign: "top" },
      headStyles: { fillColor: RED, textColor: 255, fontSize: 7 },
      columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 95 }, 7: { cellWidth: 100 } },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // rodapé (todas as páginas)
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`WLM · Diagnóstico Interno${audit.codigoFmt ? " · " + audit.codigoFmt : ""}`, 40, H - 20);
    doc.text(`Página ${p}/${pages}`, W - 40, H - 20, { align: "right" });
  }

  doc.save(`${(audit.codigoFmt || "diagnostico").replace(/\//g, "-")}.pdf`);
}
