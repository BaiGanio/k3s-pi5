// playground.js
// Builds the sidebar from MODULE_REGISTRY, handles dynamic module loading,
// then hands off to app.js (render) once commandData is ready.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // ── State ─────────────────────────────────────────────────────────────────
  let activeModuleId = null;
  // No script cache — every module switch removes the old script tag and
  // injects a fresh one, which re-executes the file and overwrites
  // window.commandData with the correct module's data.

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const sidebarNav    = document.getElementById('sidebar-nav');
  const moduleEmpty   = document.getElementById('module-empty');
  const moduleHeader  = document.getElementById('module-header');
  const moduleTitle   = document.getElementById('module-title');
  const moduleSubtitle= document.getElementById('module-subtitle');
  const commandList   = document.getElementById('commandList');
  const noResults     = document.getElementById('noResults');
  const searchInput   = document.getElementById('searchInput');
  const filterControls= document.getElementById('filterControls');
  const sidebar       = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');

  // ── Build sidebar from registry ───────────────────────────────────────────
  MODULE_REGISTRY.forEach(group => {
    const groupLabel = document.createElement('div');
    groupLabel.className = 'sidebar-group-label';
    groupLabel.innerHTML = `<span>${group.icon}</span><span>${group.group}</span>`;
    sidebarNav.appendChild(groupLabel);

    group.modules.forEach(mod => {
      const btn = document.createElement('button');
      btn.className = 'sidebar-module-btn' + (mod.ready ? '' : ' disabled');
      btn.dataset.id = mod.id;
      btn.innerHTML = `
        ${mod.title}
        ${mod.subtitle ? `<span class="sidebar-module-subtitle">${mod.subtitle}</span>` : ''}
      `;

      if (mod.ready) {
        btn.addEventListener('click', () => {
          // Close mobile sidebar
          sidebar.classList.remove('open');
          loadModule(mod);
        });
      }

      sidebarNav.appendChild(btn);
    });
  });

  // ── Mobile toggle ─────────────────────────────────────────────────────────
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      e.target !== sidebarToggle
    ) {
      sidebar.classList.remove('open');
    }
  });

  // ── URL hash routing: ?module=m1-devops-intro ─────────────────────────────
  function getModuleFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('module');
  }

  function setModuleInURL(id) {
    const url = new URL(window.location);
    url.searchParams.set('module', id);
    history.replaceState(null, '', url);
  }

  // ── Load a module ─────────────────────────────────────────────────────────
  function loadModule(mod) {
    // Mark active in sidebar
    document.querySelectorAll('.sidebar-module-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.sidebar-module-btn[data-id="${mod.id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    activeModuleId = mod.id;
    setModuleInURL(mod.id);

    // Show header, hide empty state
    moduleEmpty.style.display  = 'none';
    moduleHeader.style.display = '';
    moduleTitle.textContent    = mod.title;
    moduleSubtitle.textContent = mod.subtitle || '';

    // Reset search input
    if (searchInput) searchInput.value = '';

    // Remove the previously injected module script so the browser re-executes
    // the new file from scratch — this is what overwrites window.commandData.
    const prev = document.getElementById('active-module-script');
    if (prev) prev.remove();

    const script = document.createElement('script');
    script.id  = 'active-module-script';
    script.src = mod.script + '?t=' + Date.now(); // bypass browser cache
    script.onload = () => bootAppJs();
    script.onerror = () => {
      commandList.innerHTML = `
        <div class="alert alert-danger mt-4">
          Failed to load module script: <code>${mod.script}</code>
        </div>`;
    };
    document.body.appendChild(script);
  }

  // ── Boot app.js after commandData is ready ────────────────────────────────
  function bootAppJs() {
    // Clear previous render artifacts
    commandList.innerHTML = '';
    filterControls.innerHTML = '';
    noResults.style.display = 'none';

    // Fire the event that signals app.js to (re-)initialize
    document.dispatchEvent(new CustomEvent('playground:moduleReady'));
  }

  // ── Auto-load from URL on first paint ────────────────────────────────────
  const initialId = getModuleFromURL();
  if (initialId) {
    for (const group of MODULE_REGISTRY) {
      const mod = group.modules.find(m => m.id === initialId && m.ready);
      if (mod) { loadModule(mod); break; }
    }
  }

})();