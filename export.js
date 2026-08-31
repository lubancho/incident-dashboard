(function () {
  const U = window.IncidentUtils;

  function filtersToLines(state) {
    return [
      `Search: ${state.search || 'All'}`,
      `Object: ${state.objectQuery || 'All'}`,
      `Period: ${state.period.startIso} — ${state.period.endIso}`,
      `Incident types: ${(state.typeFilters && state.typeFilters.length && !state.typeFilters.includes('all')) ? state.typeFilters.map(U.typeShortName).join(', ') : 'All'}`,
      `Risk: ${(state.riskFilters && state.riskFilters.length && !state.riskFilters.includes('all')) ? state.riskFilters.map(x => x[0].toUpperCase() + x.slice(1)).join(', ') : 'All'}`
    ];
  }

  function buildWorkbook(viewModel, state) {
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ['Filter', 'Value'],
      ...filtersToLines(state).map(line => line.split(': ').length > 1 ? line.split(': ') : [line, '']),
      [],
      ['KPI', 'Value'],
      ['Total incidents', viewModel.kpis.total],
      ['Невыход', viewModel.kpis.type1],
      ['>7 дней', viewModel.kpis.type2],
      ['Качество', viewModel.kpis.type3],
      ['Trend delta', viewModel.kpis.trendDelta],
      ['Trend pct', `${viewModel.kpis.trendPct}%`]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    const objectsSheet = XLSX.utils.json_to_sheet(viewModel.objectSummary.map(item => ({
      Object: item.object,
      'Невыход': item.type1,
      '>7 дней': item.type2,
      'Качество': item.type3,
      Total: item.total,
      Risk: item.risk.label
    })));
    XLSX.utils.book_append_sheet(wb, objectsSheet, 'Objects');

    const incidentsSheet = XLSX.utils.json_to_sheet(viewModel.filteredRows.map(row => ({
      Date: row.date,
      Object: row.object,
      Category: row.category,
      Comment: row.comment,
      AuditNumber: row.auditNumber
    })));
    XLSX.utils.book_append_sheet(wb, incidentsSheet, 'Incidents');

    return wb;
  }

  function exportExcel(viewModel, state) {
    const wb = buildWorkbook(viewModel, state);
    const filename = `incident-analytics-${state.period.startIso}-to-${state.period.endIso}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  function drawWrappedText(doc, text, x, y, width, fontSize, color) {
    doc.setFontSize(fontSize);
    doc.setTextColor(color || 15);
    const lines = doc.splitTextToSize(String(text || ''), width);
    doc.text(lines, x, y);
    return lines.length * (fontSize * 0.45) + 2;
  }

  function drawTable(doc, columns, rows, options) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = options.margin || 16;
    const widths = options.widths;
    const rowHeight = options.rowHeight || 10;
    let y = options.startY || 20;

    const renderHeader = () => {
      doc.setFillColor(248, 251, 255);
      doc.setDrawColor(217, 226, 242);
      doc.setLineWidth(0.4);
      doc.rect(margin, y - 6, pageWidth - margin * 2, rowHeight + 4, 'FD');

      let x = margin + 3;
      doc.setFontSize(9);
      doc.setTextColor(15);
      columns.forEach((col, i) => {
        const w = widths[i];
        doc.text(String(col.title), x, y + 1);
        x += w;
      });
      y += rowHeight;
    };

    renderHeader();

    rows.forEach((row, idx) => {
      const contentHeight = row.cells.reduce((max, cell, i) => {
        const split = doc.splitTextToSize(String(cell ?? ''), widths[i] - 6);
        return Math.max(max, split.length * 4.2);
      }, rowHeight);

      if (y + contentHeight + 10 > pageHeight - margin) {
        doc.addPage();
        y = margin + 10;
        renderHeader();
      }

      doc.setDrawColor(235, 242, 250);
      doc.setLineWidth(0.3);
      doc.rect(margin, y - 4, pageWidth - margin * 2, contentHeight + 5, 'S');

      let x = margin + 3;
      row.cells.forEach((cell, i) => {
        const text = String(cell ?? '');
        const split = doc.splitTextToSize(text, widths[i] - 6);
        doc.text(split, x, y);
        x += widths[i];
      });

      y += contentHeight + 6;
    });
  }

  function exportPDF(viewModel, state) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(11, 95, 255);
    doc.text('Incident Analytics Dashboard', 14, y);

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60);
    y += drawWrappedText(doc, `Period: ${state.period.startIso} — ${state.period.endIso}`, 14, y + 1, pageWidth - 28, 10, 60);
    y += drawWrappedText(doc, `Search: ${state.search || 'All'} | Object: ${state.objectQuery || 'All'} | Types: ${(state.typeFilters && state.typeFilters.length && !state.typeFilters.includes('all')) ? state.typeFilters.map(U.typeShortName).join(', ') : 'All'} | Risk: ${(state.riskFilters && state.riskFilters.length && !state.riskFilters.includes('all')) ? state.riskFilters.map(x => x[0].toUpperCase() + x.slice(1)).join(', ') : 'All'}`, 14, y + 1, pageWidth - 28, 10, 60);
    y += 2;

    const kpiLine = `Total: ${viewModel.kpis.total} | Невыход: ${viewModel.kpis.type1} | >7 дней: ${viewModel.kpis.type2} | Качество: ${viewModel.kpis.type3} | Trend: ${viewModel.kpis.trendDelta >= 0 ? '+' : ''}${viewModel.kpis.trendDelta} (${viewModel.kpis.trendPct}%)`;
    y += drawWrappedText(doc, kpiLine, 14, y + 1, pageWidth - 28, 10, 15);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15);
    doc.text('Objects', 14, y);
    y += 4;

    drawTable(
      doc,
      [
        { title: 'Object' },
        { title: 'Невыход' },
        { title: '>7 дней' },
        { title: 'Качество' },
        { title: 'Total' },
        { title: 'Risk' }
      ],
      viewModel.objectSummary.map(item => ({
        cells: [item.object, item.type1, item.type2, item.type3, item.total, item.risk.label]
      })),
      {
        startY: y + 4,
        widths: [86, 26, 26, 26, 24, 20],
        rowHeight: 9,
        margin: 14
      }
    );

    const incidentsStartPage = doc.getNumberOfPages();
    if (viewModel.filteredRows.length) {
      doc.addPage();
      y = 16;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15);
      doc.text('Incidents', 14, y);
      y += 4;

      drawTable(
        doc,
        [
          { title: 'Date' },
          { title: 'Object' },
          { title: 'Incident type' },
          { title: 'Comment' },
          { title: 'Audit number' }
        ],
        viewModel.filteredRows.map(row => ({
          cells: [U.formatDateShort(row.date), row.object, row.category, row.comment, row.auditNumber]
        })),
        {
          startY: y + 4,
          widths: [26, 58, 62, 106, 30],
          rowHeight: 9,
          margin: 14
        }
      );
    }

    const filename = `incident-analytics-${state.period.startIso}-to-${state.period.endIso}.pdf`;
    doc.save(filename);
  }

  window.IncidentExport = {
    exportExcel,
    exportPDF
  };
})();

