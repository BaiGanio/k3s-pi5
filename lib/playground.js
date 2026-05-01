// playground.js
// Builds the sidebar from MODULE_REGISTRY, handles:
//   • Accordion collapsible groups (click category label to expand/collapse)
//   • Desktop sidebar toggle (collapse/expand via navbar button)
//   • Mobile overlay sidebar (unchanged behaviour)
//   • Dynamic module loading, then hands off to app.js via 'playground:moduleReady'
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // ── State ─────────────────────────────────────────────────────────────────
  let activeModuleId = null;

  // Track which groups are collapsed. Default: all expanded.
  // Persisted in sessionStorage so page refresh keeps state.
  const COLLAPSED_KEY = 'sidebar-collapsed-groups';
  function getCollapsedGroups() {
    const stored = sessionStorage.getItem(COLLAPSED_KEY);
    if (stored === null) {
      // First visit: all groups collapsed by default
      return new Set(MODULE_REGISTRY.map(g => g.group));
    }
    try { return new Set(JSON.parse(stored) || []); }
    catch { return new Set(MODULE_REGISTRY.map(g => g.group)); }
  }
  function saveCollapsedGroups(set) {
    sessionStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set]));
  }
  const collapsedGroups = getCollapsedGroups();

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const sidebarNav     = document.getElementById('sidebar-nav');
  const moduleEmpty    = document.getElementById('module-empty');
  const moduleHeader   = document.getElementById('module-header');
  const moduleTitle    = document.getElementById('module-title');
  const moduleSubtitle = document.getElementById('module-subtitle');
  const commandList    = document.getElementById('commandList');
  const noResults      = document.getElementById('noResults');
  const searchInput    = document.getElementById('searchInput');
  const filterControls = document.getElementById('filterControls');
  const sidebar        = document.getElementById('sidebar');
  const sidebarToggle  = document.getElementById('sidebar-toggle');

  // ── Helpers ───────────────────────────────────────────────────────────────
  function groupAnchorId(groupName) {
    return 'welcome-group-' + groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function updateToggleIcon(isCollapsed) {
    const icon = document.getElementById('sidebar-icon');
    if (!icon) return;
    icon.className = isCollapsed
      ? 'bi bi-layout-sidebar-reverse'
      : 'bi bi-layout-sidebar';
    sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
  }

  // ── Build sidebar: accordion groups ───────────────────────────────────────
  MODULE_REGISTRY.forEach(group => {
    const isCollapsed = collapsedGroups.has(group.group);

    // ── Group wrapper ──────────────────────────────────────────────────────
    const groupEl = document.createElement('div');
    groupEl.className = 'sidebar-group' + (isCollapsed ? ' collapsed' : '');

    // ── Group label (acts as toggle button) ────────────────────────────────
    const labelEl = document.createElement('button');
    labelEl.className = 'sidebar-group-label';
    labelEl.setAttribute('aria-expanded', String(!isCollapsed));
    labelEl.innerHTML = `
      <span class="label-left">
        <span>${group.icon}</span>
        <span>${group.group}</span>
      </span>
      <span class="chevron">▾</span>
    `;

    labelEl.addEventListener('click', () => {
      const nowCollapsed = groupEl.classList.toggle('collapsed');
      labelEl.setAttribute('aria-expanded', String(!nowCollapsed));
      if (nowCollapsed) {
        collapsedGroups.add(group.group);
      } else {
        collapsedGroups.delete(group.group);
      }
      saveCollapsedGroups(collapsedGroups);
    });

    // ── Items container ────────────────────────────────────────────────────
    const itemsEl = document.createElement('div');
    itemsEl.className = 'sidebar-group-items';

    group.modules.forEach(mod => {
      const btn = document.createElement('button');
      btn.className = 'sidebar-module-btn' + (mod.ready ? '' : ' disabled');
      btn.dataset.id = mod.id;
      btn.innerHTML = `
        ${mod.title}
        ${(mod.sidebarSubtitle ?? mod.subtitle) ? `<span class="sidebar-module-subtitle">${mod.sidebarSubtitle ?? mod.subtitle}</span>` : ''}
      `;

      if (mod.ready) {
        btn.addEventListener('click', () => {
          // On mobile, close the overlay sidebar after picking a module
          if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
          }
          loadModule(mod);
        });
      }

      itemsEl.appendChild(btn);
    });

    groupEl.appendChild(labelEl);
    groupEl.appendChild(itemsEl);
    sidebarNav.appendChild(groupEl);
  });

  // ── Desktop sidebar collapse / Mobile overlay toggle ──────────────────────
  const DESKTOP_COLLAPSED_KEY = 'sidebar-desktop-collapsed';

  function isMobile() { return window.innerWidth <= 768; }

  // Restore desktop collapsed state
  const initiallyCollapsed = !isMobile() && sessionStorage.getItem(DESKTOP_COLLAPSED_KEY) === 'true';
  if (initiallyCollapsed) sidebar.classList.add('collapsed');
  updateToggleIcon(initiallyCollapsed);

  sidebarToggle.addEventListener('click', () => {
    if (isMobile()) {
      // Mobile: slide-in overlay
      sidebar.classList.toggle('open');
    } else {
      // Desktop: collapse/expand
      const isNowCollapsed = sidebar.classList.toggle('collapsed');
      sessionStorage.setItem(DESKTOP_COLLAPSED_KEY, String(isNowCollapsed));
      updateToggleIcon(isNowCollapsed);
    }
  });

  // Close mobile overlay when clicking outside the sidebar
  document.addEventListener('click', (e) => {
    if (
      isMobile() &&
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      e.target !== sidebarToggle
    ) {
      sidebar.classList.remove('open');
    }
  });

  // ── URL hash routing ──────────────────────────────────────────────────────
  function getModuleFromURL() {
    return new URLSearchParams(window.location.search).get('module');
  }

  function setModuleInURL(id) {
    const url = new URL(window.location);
    url.searchParams.set('module', id);
    history.replaceState(null, '', url);
  }

  // ── Load a module ─────────────────────────────────────────────────────────
  function loadModule(mod) {
    // Update active state in sidebar
    document.querySelectorAll('.sidebar-module-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.sidebar-module-btn[data-id="${mod.id}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');

      // If this module's group is collapsed, auto-expand it
      const parentGroup = activeBtn.closest('.sidebar-group');
      if (parentGroup && parentGroup.classList.contains('collapsed')) {
        parentGroup.classList.remove('collapsed');
        const label = parentGroup.querySelector('.sidebar-group-label');
        if (label) label.setAttribute('aria-expanded', 'true');
        collapsedGroups.delete(
          parentGroup.querySelector('.sidebar-group-label .label-left span:last-child')?.textContent?.trim()
        );
        saveCollapsedGroups(collapsedGroups);
      }
    }

    activeModuleId = mod.id;
    setModuleInURL(mod.id);

    // Show header, hide empty state
    moduleEmpty.style.display  = 'none';
    moduleHeader.style.display = '';
    moduleTitle.textContent    = mod.title;
    moduleSubtitle.textContent = mod.subtitle || '';

    // Reset search
    if (searchInput) searchInput.value = '';

    // Swap module script (forces re-execution → overwrites window.commandData)
    const prev = document.getElementById('active-module-script');
    if (prev) prev.remove();

    const script    = document.createElement('script');
    script.id       = 'active-module-script';
    script.src      = mod.script + '?t=' + Date.now();
    script.onload   = bootAppJs;
    script.onerror  = () => {
      commandList.innerHTML = `
        <div class="alert alert-danger mt-4">
          Failed to load module script: <code>${mod.script}</code>
        </div>`;
    };
    document.body.appendChild(script);
  }

  // ── Boot app.js after commandData is ready ────────────────────────────────
  function bootAppJs() {
    commandList.innerHTML    = '';
    filterControls.innerHTML = '';
    noResults.style.display  = 'none';
    document.dispatchEvent(new CustomEvent('playground:moduleReady'));
  }

  // ── Build welcome screen from MODULE_REGISTRY ─────────────────────────────
  // Cards mirror the sidebar — both stay in sync with zero duplication.
  function buildWelcomeScreen() {
    const iconColors = ['clr-blue', 'clr-teal', 'clr-purple', 'clr-amber'];

    const greeting = document.createElement('div');
    greeting.className = 'welcome-greeting';
    greeting.innerHTML = `
      <h2>Hands-on labs for running Kubernetes on a Raspberry Pi 5</h2>
      <p>Pick a module below — each one walks you through real commands with context and examples.</p>
    `;
    moduleEmpty.appendChild(greeting);

    MODULE_REGISTRY.forEach((group, gi) => {
      const clr = iconColors[gi % iconColors.length];

      const label = document.createElement('p');
      label.className = 'welcome-section-label';
      label.id = groupAnchorId(group.group);
      label.textContent = group.group;
      moduleEmpty.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'welcome-grid';

      group.modules.forEach(mod => {
        const card = document.createElement('button');
        card.className = 'welcome-card' + (mod.ready ? '' : ' disabled');
        card.innerHTML = `
          <div class="welcome-card-icon ${clr}">${group.icon}</div>
          <p class="welcome-card-title">${mod.title}</p>
          ${mod.subtitle ? `<p class="welcome-card-sub">${mod.subtitle}</p>` : ''}
          <span class="welcome-card-badge ${mod.ready ? 'ready' : 'soon'}">${mod.ready ? 'Ready' : 'Soon'}</span>
        `;
        if (mod.ready) {
          card.addEventListener('click', () => loadModule(mod));
        }
        grid.appendChild(card);
      });

      moduleEmpty.appendChild(grid);
    });
  }

  // ── Show welcome screen and scroll to a group section ────────────────────
  function showWelcomeAndScrollTo(groupName) {
    if (activeModuleId) {
      activeModuleId = null;
      document.querySelectorAll('.sidebar-module-btn').forEach(b => b.classList.remove('active'));
      moduleEmpty.style.display  = '';
      moduleHeader.style.display = 'none';
      commandList.innerHTML      = '';
      noResults.style.display    = 'none';
      const url = new URL(window.location);
      url.searchParams.delete('module');
      history.replaceState(null, '', url);
    }
    const anchor = document.getElementById(groupAnchorId(groupName));
    if (anchor) {
      const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
      const top = anchor.getBoundingClientRect().top + window.scrollY - navbarHeight - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // ── Build navbar group links ───────────────────────────────────────────────
  function buildNavbarGroupLinks() {
    const container = document.getElementById('navbar-group-links');
    if (!container) return;
    MODULE_REGISTRY.forEach((group, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'text-secondary';
        sep.style.fontSize = '0.8rem';
        sep.textContent = '|';
        container.appendChild(sep);
      }
      const link = document.createElement('a');
      link.className = 'nav-link text-secondary px-2';
      link.style.fontSize = '0.88rem';
      link.href = '#';
      link.textContent = group.group;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showWelcomeAndScrollTo(group.group);
      });
      container.appendChild(link);
    });
  }

  buildWelcomeScreen();
  buildNavbarGroupLinks();

  // ── Auto-load module from URL on first paint ──────────────────────────────
  const initialId = getModuleFromURL();
  if (initialId) {
    for (const group of MODULE_REGISTRY) {
      const mod = group.modules.find(m => m.id === initialId && m.ready);
      if (mod) { loadModule(mod); break; }
    }
  }

})();