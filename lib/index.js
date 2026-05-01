// app.js — module renderer
// Supports two data formats from module scripts:
//   window.pageBlocks  — typed block array (new format)
//   window.commandData — flat command array (legacy, auto-wrapped)
// ─────────────────────────────────────────────────────────────────────────────

function makeFilterBtn(label, value, isActive, onFilter) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-outline-secondary rounded-pill filter-btn' + (isActive ? ' active' : '');
  btn.textContent = label;
  btn.dataset.filter = value;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    onFilter(value);
  });
  return btn;
}

// ── Normalise whatever the module exported into a blocks array ────────────────
function normaliseBlocks() {
  if (typeof pageBlocks !== 'undefined' && Array.isArray(pageBlocks) && pageBlocks.length) {
    return pageBlocks;
  }
  if (typeof commandData === 'undefined' || !commandData.length) return [];

  // Auto-wrap legacy commandData: group by section, preserving order
  const sectionMap = new Map();
  commandData.forEach(cmd => {
    if (!sectionMap.has(cmd.section)) {
      sectionMap.set(cmd.section, {
        type: 'commands',
        section: cmd.section,
        sectionTitle: cmd.sectionTitle,
        items: [],
      });
    }
    sectionMap.get(cmd.section).items.push(cmd);
  });
  return [...sectionMap.values()];
}

// ── Core init — call this whenever module data changes ────────────────────────
function initApp() {
  const commandList    = document.getElementById('commandList');
  let   searchInput    = document.getElementById('searchInput');
  const filterControls = document.getElementById('filterControls');
  const noResults      = document.getElementById('noResults');

  if (!commandList || !searchInput || !filterControls || !noResults) return;

  const blocks = normaliseBlocks();
  if (!blocks.length) return;

  const commandBlocks = blocks.filter(b => b.type === 'commands');
  const sectionNumbers = {};
  commandBlocks.forEach((b, i) => { sectionNumbers[b.section] = i + 1; });

  let activeFilter = 'all';

  // ── Filter buttons ──────────────────────────────────────────────────────────
  filterControls.innerHTML = '';
  filterControls.appendChild(makeFilterBtn('All', 'all', true, v => { activeFilter = v; render(); }));
  commandBlocks.forEach((b, i) => {
    filterControls.appendChild(
      makeFilterBtn(`Step ${i + 1}. ${b.sectionTitle}`, b.section, false, v => { activeFilter = v; render(); })
    );
  });

  // ── Block renderers ─────────────────────────────────────────────────────────

  function renderProseBlock(block) {
    const div = document.createElement('div');
    div.className = 'module-prose collapsed mb-4';

    if (block.title) {
      // Collapsible card — collapsed by default
      const header = document.createElement('button');
      header.className = 'module-prose-header';
      header.setAttribute('aria-expanded', 'false');
      header.innerHTML = `
        <span class="module-prose-title">${block.title}</span>
        <i class="bi bi-chevron-down module-prose-chevron"></i>
      `;

      const bodyWrap = document.createElement('div');
      bodyWrap.className = 'module-prose-body';
      const bodyInner = document.createElement('div');
      bodyInner.className = 'module-prose-body-inner';
      bodyInner.innerHTML = block.content;
      bodyWrap.appendChild(bodyInner);

      header.addEventListener('click', () => {
        const nowCollapsed = div.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', String(!nowCollapsed));
      });

      div.appendChild(header);
      div.appendChild(bodyWrap);
    } else {
      // No title — plain card, no toggle
      const body = document.createElement('div');
      body.className = 'module-prose-plain';
      body.innerHTML = block.content;
      div.appendChild(body);
    }

    return div;
  }

  function renderNoteBlock(block) {
    const icons = { info: 'ℹ️', warning: '⚠️', tip: '💡' };
    const variant = block.variant || 'info';
    const div = document.createElement('div');
    div.className = `module-note module-note--${variant} mb-4`;
    div.innerHTML = `<span class="module-note-icon">${icons[variant] || icons.info}</span><span class="module-note-content">${block.content}</span>`;
    return div;
  }

  function renderCommandsBlock(block, query) {
    const cmds = block.items.filter(cmd => {
      const matchFilter = activeFilter === 'all' || block.section === activeFilter;
      const matchSearch = !query ||
        cmd.command.toLowerCase().includes(query) ||
        cmd.searchTerms.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });

    if (cmds.length === 0) return null;

    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'mb-4';
    sectionDiv.innerHTML = `
      <h5 class="fw-semibold mb-3 d-flex align-items-center gap-2">
        <span class="section-badge">${sectionNumbers[block.section]}</span>
        ${block.sectionTitle}
      </h5>
    `;

    const accordion = document.createElement('div');
    accordion.className = 'accordion shadow-sm';
    accordion.id = `acc-${block.section}`;

    cmds.forEach(cmd => {
      const collapseId = `collapse-${cmd.id}`;

      const partsHtml = cmd.parts.map(p =>
        `<span class="command-part">${p.text}</span>`
      ).join(' ');

      const breakdownHtml = cmd.parts.map(p =>
        `<li><code>${p.text}</code> — ${p.explanation}</li>`
      ).join('');

      const commandLines = cmd.command.split(' && ').map(c => c.trim());
      const commandLinesHtml = commandLines.map(line => `
        <div class="command-line d-flex align-items-center justify-content-between gap-2 mb-1">
          <code class="flex-grow-1">${line}</code>
          <button class="btn btn-sm btn-outline-secondary copy-btn"
            data-cmd="${line.replace(/"/g, '&quot;')}">Copy</button>
        </div>
      `).join('');

      accordion.innerHTML += `
        <div class="accordion-item border" id="item-${cmd.id}">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button"
              data-bs-toggle="collapse" data-bs-target="#${collapseId}"
              aria-expanded="false" aria-controls="${collapseId}">
              <code class="text-truncate d-inline-block" style="max-width:90%">${cmd.commandTitle}</code>
            </button>
          </h2>
          <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="">
            <div class="accordion-body pt-0">
              <hr class="mt-0" />
              <div class="mb-3">
                <div class="detail-label">Commands</div>
                ${commandLinesHtml}
              </div>
              <div class="mb-3">
                <div class="detail-label">What it does</div>
                <div>${cmd.description}</div>
              </div>
              <div class="mb-3">
                <div class="detail-label">Breaking it down</div>
                <div class="mb-2">${partsHtml}</div>
                <ul class="list-unstyled small text-secondary ps-1 mb-0">
                  ${breakdownHtml}
                </ul>
              </div>
              <div class="mb-3">
                <div class="detail-label">Example output</div>
                <div class="example-box">${cmd.example}</div>
              </div>
              <div class="why-box">
                💡 <strong>Why:</strong> ${cmd.why}
              </div>
            </div>
          </div>
        </div>
      `;
    });

    accordion.addEventListener('click', async e => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;
      await navigator.clipboard.writeText(btn.dataset.cmd);
      btn.textContent = '✓ Copied';
      setTimeout(() => (btn.textContent = 'Copy'), 2000);
    });

    sectionDiv.appendChild(accordion);
    return { el: sectionDiv, count: cmds.length };
  }

  // Returns true when a commands block would produce visible rows given current filter + query
  function commandsBlockVisible(b, query) {
    const matchesFilter = activeFilter === 'all' || b.section === activeFilter;
    if (!matchesFilter) return false;
    if (!query) return true;
    return b.items.some(cmd =>
      cmd.command.toLowerCase().includes(query) ||
      cmd.searchTerms.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  function render() {
    const query = searchInput.value.toLowerCase().trim();
    commandList.innerHTML = '';
    let totalShown = 0;
    const filtering = activeFilter !== 'all' || query;

    blocks.forEach((block, i) => {
      if (block.type === 'prose') {
        if (!filtering) commandList.appendChild(renderProseBlock(block));
      } else if (block.type === 'note') {
        // Show a note only when its associated commands block (the next one) is visible
        const nextCommands = blocks.slice(i + 1).find(b => b.type === 'commands');
        if (!nextCommands || commandsBlockVisible(nextCommands, query)) {
          commandList.appendChild(renderNoteBlock(block));
        }
      } else if (block.type === 'commands') {
        const result = renderCommandsBlock(block, query);
        if (result) {
          commandList.appendChild(result.el);
          totalShown += result.count;
        }
      }
    });

    noResults.style.display = totalShown === 0 ? 'block' : 'none';
  }

  // Remove any previous search listener to avoid stacking them
  const newSearch = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearch, searchInput);
  searchInput = newSearch;
  newSearch.addEventListener('input', render);

  render();
}

// ── Mode detection ────────────────────────────────────────────────────────────
if (document.getElementById('sidebar-nav')) {
  document.addEventListener('playground:moduleReady', initApp);
} else {
  initApp();
}
