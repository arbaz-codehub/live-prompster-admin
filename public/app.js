document.addEventListener('DOMContentLoaded', () => {

  // --- Auth & Socket Logic ---
  const authScreen = document.getElementById('auth-screen');
  const mainApp = document.getElementById('main-app');
  const authForm = document.getElementById('auth-form');
  const authPassword = document.getElementById('auth-password');
  let socket = null;

  let adminPassword = sessionStorage.getItem('adminPassword');
  
  if (adminPassword) {
    loginSuccess(adminPassword);
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = authPassword.value;
    
    try {
      const res = await fetch('/api/categories', {
        headers: { 'x-admin-password': pwd }
      });
      if (res.ok) {
        loginSuccess(pwd);
      } else {
        alert('Invalid password');
      }
    } catch (err) {
      alert('Cannot connect to server');
    }
  });

  window.logout = function() {
    sessionStorage.removeItem('adminPassword');
    location.reload();
  };

  async function loginSuccess(pwd) {
    adminPassword = pwd;
    sessionStorage.setItem('adminPassword', pwd);
    authScreen.style.display = 'none';
    mainApp.style.display = 'block';
    
    // Connect Socket.io
    socket = io();
    socket.on('db_change', (payload) => {
      console.log('Realtime change detected:', payload);
      const tabMap = {
        prompts: 'prompts',
        marketplace_items: 'marketplace',
        tools_items: 'tools',
        resources_items: 'resources',
        promo_banners: 'promo',
        workshops: 'workshops'
      };
      const tabName = tabMap[payload.table];
      if (tabName) {
        // Soft refresh without showing loading skeleton to prevent flicker
        loadData(tabName, payload.table, '*', false);
        if (payload.table === 'marketplace_items') loadPacksForDropdown();
        if (payload.table === 'prompts') loadCategoriesForDropdown();
      }
    });

    await initApp();
  }

  // --- Toast Notification Logic ---
  const toastEl = document.getElementById('toast');
  function showToast(message, type = 'success') {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = '';
    toastEl.classList.add('show');
    
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3000);
  }

  // --- Custom Confirm Modal Logic ---
  function showConfirmModal(title, text, isDanger = false) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-title');
      const textEl = document.getElementById('confirm-text');
      const cancelBtn = document.getElementById('confirm-cancel-btn');
      const okBtn = document.getElementById('confirm-ok-btn');

      titleEl.textContent = title;
      textEl.textContent = text;
      
      if (isDanger) {
        okBtn.classList.add('danger');
        okBtn.textContent = 'Delete';
      } else {
        okBtn.classList.remove('danger');
        okBtn.textContent = 'Save';
      }

      modal.classList.add('active');

      const cleanup = () => {
        cancelBtn.removeEventListener('click', onCancel);
        okBtn.removeEventListener('click', onOk);
        modal.classList.remove('active');
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      const onOk = () => {
        cleanup();
        resolve(true);
      };

      cancelBtn.addEventListener('click', onCancel);
      okBtn.addEventListener('click', onOk);
    });
  }

  // --- Helper: Authenticated Fetch ---
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-admin-password': adminPassword,
      ...(options.headers || {})
    };
    const response = await fetch(endpoint, { ...options, headers });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // --- UI State Management ---
  window.showForm = function(tabName, isEdit = false) {
    document.getElementById(`list-view-${tabName}`).classList.add('hidden');
    document.getElementById(`form-view-${tabName}`).classList.remove('hidden');
    
    const titleEl = document.getElementById(`form-title-${tabName}`);
    if (titleEl) {
      titleEl.textContent = isEdit ? `Edit ${tabName}` : `Add New ${tabName}`;
    }

    if (!isEdit) {
      document.getElementById(`form-${tabName}`).reset();
      const idInput = document.getElementById(`${tabName === 'marketplace' ? 'marketplace' : tabName.replace(/s$/, '')}-id`);
      if (idInput) idInput.value = '';
      
      if (tabName === 'resources') {
        document.getElementById('resource-id').readOnly = false;
      }
    }
  };

  window.showList = function(tabName) {
    document.getElementById(`form-view-${tabName}`).classList.add('hidden');
    document.getElementById(`list-view-${tabName}`).classList.remove('hidden');
  };

  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.getAttribute('data-tab');
      document.getElementById(`panel-${tabName}`).classList.add('active');
      window.showList(tabName);
    });
  });

  // Global State
  let marketplacePacks = [];
  const loadedData = {
    prompts: [], marketplace: [], tools: [],
    resources: [], promo: [], workshops: []
  };

  // --- Fetch and Render Data ---
  function showSkeleton(listEl) {
    listEl.innerHTML = Array(3).fill(`
      <li class="skeleton-item">
        <div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
        <div style="display:flex; gap: 8px;">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </li>
    `).join('');
  }

  async function loadData(tabName, tableName, columns = '*', showLoading = true) {
    const listEl = document.getElementById(`list-${tabName}`);
    if (showLoading && listEl) showSkeleton(listEl);

    try {
      const data = await apiFetch(`/api/data/${tableName}?select=${columns}`);
      loadedData[tabName] = data || [];
      renderList(tabName);
    } catch (err) {
      console.error(`Failed to load ${tableName}:`, err);
      if (listEl) {
        listEl.innerHTML = `<div class="empty-state" style="color: var(--color-error)">Error loading data: ${err.message}</div>`;
      }
      showToast(`Warning: Failed to load ${tabName}`, 'error');
    }
  }

  function renderList(tabName) {
    const listEl = document.getElementById(`list-${tabName}`);
    if (!listEl) return;
    
    listEl.innerHTML = '';
    const items = loadedData[tabName];

    if (items.length === 0) {
      listEl.innerHTML = `<div class="empty-state">No items found. Click "+ Add New" to create one.</div>`;
      return;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'data-item';
      
      const title = item.title || item.name || item.id;
      const subtitle = item.slug || item.tag || item.category || item.status || '';

      li.innerHTML = `
        <div class="data-item-info">
          <strong>${title}</strong>
          <span>${subtitle}</span>
        </div>
        <div class="data-item-actions">
          <button class="btn-edit" onclick="window.editItem('${tabName}', '${item.id}')">Edit</button>
          <button class="btn-delete" onclick="window.deleteItem('${tabName}', '${item.id}')">Delete</button>
        </div>
      `;
      listEl.appendChild(li);
    });
  }

  // --- Dummy Data & Edit & Delete Logic ---
  window.fillDummyData = function(tabName) {
    const dummyData = {
      prompts: {
        title: "Neon Cyberpunk Streets",
        category: "Illustration",
        content: "A futuristic cyberpunk city street, neon lights, raining, highly detailed, 8k resolution, cinematic lighting.",
        prompts: "A futuristic cyberpunk city street, neon lights, raining, daytime.\nA futuristic cyberpunk city street, neon lights, raining, nighttime.",
        images: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800\nhttps://images.unsplash.com/photo-1552058544-f2b08422138a?w=800",
        tags: "cyberpunk, neon, rain, futuristic",
        seo_description: "Explore the gritty, neon-lit streets of a futuristic cyberpunk city.\n\n- Highly detailed textures\n- Cinematic lighting\n- 8k resolution"
      },
      marketplace: {
        title: "Master AI Portrait Prompts",
        slug: "master-ai-portrait-prompts-demo",
        description: "A comprehensive collection of 500+ portrait prompts for Midjourney v6.",
        tag: "Prompt Pack",
        image_url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800",
        link: "https://gumroad.com/l/example",
        price: "499",
        detailed_description: "Unlock the secrets to photorealistic AI portraiture. This premium pack contains over 500 rigorously tested Midjourney v6 prompts.",
        screenshots: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=800\nhttps://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800",
        why_not_buy: "You enjoy spending 40+ hours testing prompts yourself.\nYou prefer to keep getting six-fingered AI hands.",
        status: "live"
      },
      tools: {
        title: "Prompt Optimizer",
        description: "Clean and optimize your raw AI prompts automatically.",
        tag: "Utility",
        image_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800",
        link: "https://example.com/tool",
        status: "live"
      },
      resources: {
        id: "midjourney-guide",
        title: "Advanced Midjourney Settings Guide",
        description: "Master stylized values, aspect ratios, and chaos.",
        icon: "📚",
        color: "var(--color-accent-cyan)",
        count: "Read Guide",
        image_url: "https://images.unsplash.com/photo-1455390582262-044cdead27d8?w=800"
      },
      promo: {
        id: "summer-sale",
        title: "Summer Sale 50% Off",
        description: "Get the premium pack at half price this week only!",
        button_text: "Claim Offer",
        link: "/pack/master-ai-portrait-prompts",
        is_active: "true"
      }
    };

    const data = dummyData[tabName];
    if (!data) return;

    const form = document.getElementById(`form-${tabName}`);
    if (!form) return;

    Object.keys(data).forEach(key => {
      const input = form.elements[key];
      if (input) {
        input.value = data[key];
      }
    });
    
    showToast(`Dummy data filled for ${tabName}`, 'success');
  };

  window.editItem = function(tabName, id) {
    const item = loadedData[tabName].find(i => i.id === id || i.id === parseInt(id));
    if (!item) return;

    window.showForm(tabName, true);
    const form = document.getElementById(`form-${tabName}`);
    
    if (tabName === 'resources') {
      document.getElementById('resource-id').readOnly = true;
    }

    Object.keys(item).forEach(key => {
      const input = form.elements[key];
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = item[key];
        } else if (Array.isArray(item[key])) {
          if (key === 'prompts') input.value = item[key].join('\n\n');
          else if (key === 'images') input.value = item[key].join('\n');
          else if (key === 'tags') input.value = item[key].join(', ');
          else if (key === 'screenshots') input.value = item[key].join('\n');
          else if (key === 'why_not_buy') input.value = item[key].join('\n');
        } else {
          input.value = item[key] !== null ? item[key] : '';
        }
      }
    });
    
    const idInput = form.querySelector('input[name="id"]');
    if (idInput) idInput.value = item.id;
  };

  window.deleteItem = async function(tabName, id) {
    const confirmed = await showConfirmModal('Delete Item', 'Are you sure you want to delete this item? This action cannot be undone.', true);
    if (!confirmed) return;
    
    const form = document.getElementById(`form-${tabName}`);
    const tableName = form.getAttribute('data-table');
    
    // Temporary loading state
    showToast('Deleting item...', 'success');

    try {
      await apiFetch(`/api/data/${tableName}/${id}`, { method: 'DELETE' });
      showToast('Item deleted successfully.');
      // The socket event will trigger a reload automatically!
    } catch (err) {
      console.error('Delete error:', err);
      showToast(`Error deleting item: ${err.message}`, 'error');
    }
  };

  async function loadPacksForDropdown() {
    try {
      const data = await apiFetch(`/api/data/marketplace_items?select=id,title,image_url`);
      marketplacePacks = data || [];
      const packSelect = document.getElementById('prompt-pack');
      packSelect.innerHTML = '<option value="">-- No Pack (Standalone Prompt) --</option>';
      marketplacePacks.forEach(pack => {
        const option = document.createElement('option');
        option.value = pack.id;
        option.textContent = pack.title;
        packSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Failed to load packs dropdown:', err);
    }
  }

  async function loadCategoriesForDropdown() {
    try {
      const cats = await apiFetch(`/api/categories`);
      const catSelect = document.getElementById('prompt-category');
      catSelect.innerHTML = '';
      
      cats.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        catSelect.appendChild(option);
      });
      
      const option = document.createElement('option');
      option.value = "new";
      option.textContent = "+ Create New Category (Type below)";
      catSelect.appendChild(option);
    } catch (err) {
      console.error('Failed to load categories dropdown:', err);
    }
  }

  async function initApp() {
    await Promise.all([
      loadData('prompts', 'prompts'),
      loadData('marketplace', 'marketplace_items'),
      loadData('tools', 'tools_items'),
      loadData('resources', 'resources_items'),
      loadData('promo', 'promo_banners'),
      loadData('workshops', 'workshops'),
      loadPacksForDropdown(),
      loadCategoriesForDropdown()
    ]);
  }

  // --- Data Parsing Helpers ---
  function parseCommaSeparated(str) {
    if (!str || str.trim() === '') return [];
    if (Array.isArray(str)) return str;
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  function parseNewlineSeparated(str) {
    if (!str || str.trim() === '') return [];
    if (Array.isArray(str)) return str;
    return str.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  function parseDoubleNewlineSeparated(str) {
    if (!str || str.trim() === '') return [];
    if (Array.isArray(str)) return str;
    return str.split(/\n\s*\n/).map(s => s.trim()).filter(s => s.length > 0);
  }

  function generateSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // --- Generic Form Submit Handler ---
  function setupFormHandler(tabName, processDataCallback = null) {
    const form = document.getElementById(`form-${tabName}`);
    if (!form) return;
    
    const tableName = form.getAttribute('data-table');
    const btn = form.querySelector('button[type="submit"]');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const confirmed = await showConfirmModal('Save Changes', 'Are you sure you want to save these changes?');
      if (!confirmed) return;

      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.disabled = true;

      try {
        const formData = new FormData(e.target);
        let data = Object.fromEntries(formData.entries());
        const itemId = data.id;
        if (!itemId) delete data.id;

        if (processDataCallback) {
          data = processDataCallback(data, tabName);
        }

        if (itemId && tabName !== 'resources' || (itemId && tabName === 'resources' && document.getElementById('resource-id').readOnly)) {
          // UPDATE
          await apiFetch(`/api/data/${tableName}/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
          });
        } else {
          // INSERT
          await apiFetch(`/api/data/${tableName}`, {
            method: 'POST',
            body: JSON.stringify(data)
          });
        }

        showToast(`Success! Saved to ${tableName}`);
        window.showList(tabName);
        // The socket event will trigger the data reload automatically!
      } catch (err) {
        console.error('Save error:', err);
        showToast(`Error: ${err.message}`, 'error');
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }

  // --- Setup Form Handlers ---
  setupFormHandler('prompts', (data) => {
    data.slug = generateSlug(data.title);
    data.tags = parseCommaSeparated(data.tags);
    data.images = parseNewlineSeparated(data.images);
    data.prompts = parseDoubleNewlineSeparated(data.prompts);
    if (!data.seo_description) data.seo_description = null;
    
    if (data.pack_id) {
      const selectedPack = marketplacePacks.find(p => p.id === data.pack_id);
      if (selectedPack) {
        data.pack_title = selectedPack.title;
        data.pack_image_url = selectedPack.image_url;
      }
    } else {
      data.pack_id = null;
      data.pack_title = null;
      data.pack_image_url = null;
    }
    return data;
  });

  setupFormHandler('marketplace', (data) => {
    data.slug = data.slug ? generateSlug(data.slug) : generateSlug(data.title);
    data.price = parseFloat(data.price) || 0;
    data.screenshots = parseNewlineSeparated(data.screenshots);
    data.why_not_buy = parseNewlineSeparated(data.why_not_buy);
    return data;
  });
  setupFormHandler('tools', (data) => data);
  setupFormHandler('resources', (data) => data);
  setupFormHandler('promo', (data) => {
    data.is_active = data.is_active === 'true';
    return data;
  });
  setupFormHandler('workshops', (data) => {
    data.slug = generateSlug(data.title);
    data.duration_minutes = parseInt(data.duration_minutes, 10);
    return data;
  });

});
