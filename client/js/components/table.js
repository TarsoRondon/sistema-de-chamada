(function initTable(global) {
  function renderTableBody(tbody, rows, renderRow, colSpan, emptyText = 'Nenhum registro encontrado') {
    if (!tbody) return;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="table-empty">${global.AppFormat.escapeHtml(emptyText)}</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((row, index) => renderRow(row, index)).join('');
  }

  function paginate(rows, page = 1, pageSize = 25) {
    const safePageSize = Math.max(1, Number(pageSize) || 25);
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
    const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;

    return {
      totalItems,
      totalPages,
      page: safePage,
      pageSize: safePageSize,
      items: rows.slice(start, end),
    };
  }

  function renderPagination(target, { page, totalPages }, onChange) {
    if (!target) return;
    target.innerHTML = '';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'btn btn-secondary btn-small';
    prev.textContent = 'Anterior';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => onChange(page - 1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn btn-secondary btn-small';
    next.textContent = 'Proximo';
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => onChange(page + 1));

    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Pagina ${page} de ${totalPages}`;

    target.appendChild(prev);
    target.appendChild(info);
    target.appendChild(next);
  }

  global.AppTable = {
    renderTableBody,
    paginate,
    renderPagination,
  };
})(window);
