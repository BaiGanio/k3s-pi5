// app.js
// Works in two modes:
//   1. Standalone (index.html)  — commandData is already on the page, runs once.
//   2. Playground (playground.html) — listens for 'playground:moduleReady' and
//      re-initialises every time a new module is loaded by playground.js.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  var btn      = document.getElementById('sidebar-toggle');
  var divider  = document.getElementById('st-divider');
  var arrow    = document.getElementById('st-arrow');
  var sidebar  = document.getElementById('sidebar'); // <-- your sidebar id
  var open     = true;

  btn.addEventListener('click', function () {
    open = !open;

    // toggle your sidebar however you currently do it
    sidebar.classList.toggle('d-none', !open);

    // update icon
    btn.setAttribute('aria-expanded', open);
    divider.style.opacity   = open ? '1' : '0';
    divider.style.transform = open ? 'none' : 'translateX(-3px)';
    arrow.setAttribute('points', open ? '13,9 10,12 13,15' : '10,9 13,12 10,15');
  });
}());

function CopyButton(text) {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "Copy";
  btn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(text);
    btn.textContent = "✓ Copied";
    setTimeout(() => (btn.textContent = "Copy"), 2000);
  });
  return btn;
}

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

// ── Core init — call this whenever commandData changes ────────────────────────
function initApp() {
  const commandList    = document.getElementById('commandList');
  let searchInput    = document.getElementById('searchInput');
  const filterControls = document.getElementById('filterControls');
  const noResults      = document.getElementById('noResults');

  if (!commandList || !searchInput || !filterControls || !noResults) return;
  if (typeof commandData === 'undefined' || !commandData.length) return;

  // Derive unique sections preserving order
  const sectionOrder = [];
  const seenSections = {};
  commandData.forEach(cmd => {
    if (!seenSections[cmd.section]) {
      seenSections[cmd.section] = true;
      sectionOrder.push({ id: cmd.section, title: cmd.sectionTitle });
    }
  });

  let activeFilter = 'all';

  // Build filter buttons
  filterControls.innerHTML = '';
  filterControls.appendChild(makeFilterBtn('All', 'all', true, (v) => { activeFilter = v; render(); }));
  sectionOrder.forEach((f, i) => {
    const label = `Step ${i + 1}. ${f.title}`;
    filterControls.appendChild(makeFilterBtn(label, f.id, false, (v) => { activeFilter = v; render(); }));
  });

  function render() {
    const query = searchInput.value.toLowerCase().trim();
    commandList.innerHTML = '';
    let totalShown = 0;

    const sectionNumbers = {};
    sectionOrder.forEach((sec, i) => { sectionNumbers[sec.id] = i + 1; });

    sectionOrder.forEach((sec) => {
      const cmds = commandData.filter(cmd => {
        const inThisSection = cmd.section === sec.id;
        const matchFilter   = activeFilter === 'all' || cmd.section === activeFilter;
        const matchSearch   = !query ||
          cmd.command.toLowerCase().includes(query) ||
          cmd.searchTerms.toLowerCase().includes(query) ||
          cmd.description.toLowerCase().includes(query);
        return inThisSection && matchFilter && matchSearch;
      });

      if (cmds.length === 0) return;
      totalShown += cmds.length;

      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'mb-4';
      sectionDiv.innerHTML = `
        <h5 class="fw-semibold mb-3 d-flex align-items-center gap-2">
          <span class="section-badge">${sectionNumbers[sec.id]}</span>
          ${sec.title}
        </h5>
      `;

      const accordionId = `acc-${sec.id}`;
      const accordion = document.createElement('div');
      accordion.className = 'accordion shadow-sm';
      accordion.id = accordionId;

      cmds.forEach((cmd) => {
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
            <button class="btn btn-sm btn-outline-secondary copy-btn" data-cmd="${line.replace(/"/g, '&quot;')}">Copy</button>
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

      accordion.addEventListener('click', async (e) => {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;
        await navigator.clipboard.writeText(btn.dataset.cmd);
        btn.textContent = '✓ Copied';
        setTimeout(() => (btn.textContent = 'Copy'), 2000);
      });

      sectionDiv.appendChild(accordion);
      commandList.appendChild(sectionDiv);
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
// On playground.html: playground.js fires 'playground:moduleReady' after each
// module script loads. On index.html: commandData is already present at parse
// time, so we just call initApp() directly.

if (document.getElementById('sidebar-nav')) {
  // Playground mode — wait for module signals
  document.addEventListener('playground:moduleReady', initApp);
} else {
  // Standalone mode — commandData is already loaded
  initApp();
}