// Derive unique sections preserving order
const sectionOrder = [];
const seenSections = {};
commandData.forEach(cmd => {
  if (!seenSections[cmd.section]) {
    seenSections[cmd.section] = true;
    sectionOrder.push({ id: cmd.section, title: cmd.sectionTitle });
  }
});

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

// ─── RENDER ──────────────────────────────────────────────────────────────────
const commandList   = document.getElementById('commandList');
const searchInput   = document.getElementById('searchInput');
const filterControls = document.getElementById('filterControls');
const noResults     = document.getElementById('noResults');

let activeFilter = 'all';

// Build filter buttons
const allBtn = makeFilterBtn('All', 'all', true);
filterControls.appendChild(allBtn);
sectionOrder.forEach((f, i) => {
  const isAll = f.value === 'all';
  const label = isAll ? f.title : `Step ${i+1}. ${f.title}`;  // no number for "All"
  filterControls.appendChild(makeFilterBtn(label, f.id, f.id === activeFilter, i));
});

function makeFilterBtn(label, value, isActive) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-outline-secondary rounded-pill filter-btn' + (isActive ? ' active' : '');
  btn.textContent = label;
  btn.dataset.filter = value;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = value;
    render();
  });
  return btn;
}

function render() {
  const query = searchInput.value.toLowerCase().trim();
  commandList.innerHTML = '';
  let totalShown = 0;
  const sectionNumbers = {};
  sectionOrder.forEach((sec, i) => {
    sectionNumbers[sec.id] = i + 1;
  });

  sectionOrder.forEach((sec) => {
    // Commands must belong to THIS section AND match filter AND match search
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

    // Accordion per section
    const accordionId = `acc-${sec.id}`;
    const accordion = document.createElement('div');
    accordion.className = 'accordion shadow-sm';
    accordion.id = accordionId;

    cmds.forEach((cmd, i) => {
      const itemId   = `item-${cmd.id}`;
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
        <div class="accordion-item border" id="${itemId}">
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

searchInput.addEventListener('input', render);

// Initial render
render();