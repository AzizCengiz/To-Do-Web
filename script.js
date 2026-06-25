/* ════════════════════════════════════════════
   To-Do List — script.js
════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   1. DURUM (STATE)
────────────────────────────────────────── */
const state = {
  tasks:         [],
  filter:        'all',
  searchQuery:   '',
  priority:      'medium',
  theme:         'dark'
};

/* ──────────────────────────────────────────
   2. STORAGE
────────────────────────────────────────── */
const Storage = {
  save() {
    localStorage.setItem('todo_tasks', JSON.stringify(state.tasks));
  },
  saveTheme(theme) {
    localStorage.setItem('todo_theme', theme);
  },
  load() {
    try {
      const raw = localStorage.getItem('todo_tasks');
      state.tasks = raw ? JSON.parse(raw) : [];
      state.tasks = state.tasks.map((t, i) => ({
        id: t.id || uid(),
        text: t.text || '',
        done: t.done || false,
        createdAt: t.createdAt || Date.now(),
        completedAt: t.completedAt || null,
        priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
        tags: Array.isArray(t.tags) ? t.tags : [],
        dueDate: t.dueDate || null,
        order: t.order ?? i
      }));
    } catch {
      state.tasks = [];
    }

    const savedTheme = localStorage.getItem('todo_theme');
    state.theme = savedTheme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
  }
};

/* ──────────────────────────────────────────
   3. DOM REFERANSLARI
────────────────────────────────────────── */
const taskInput    = document.getElementById('taskInput');
const tagsInput    = document.getElementById('tagsInput');
const dateInput    = document.getElementById('dateInput');
const clearDateBtn = document.getElementById('clearDateBtn');
const addBtn       = document.getElementById('addBtn');
const taskList     = document.getElementById('taskList');
const emptyState   = document.getElementById('emptyState');
const errorMsg     = document.getElementById('errorMsg');
const errorText    = document.getElementById('errorText');
const totalCount   = document.getElementById('totalCount');
const activeCount  = document.getElementById('activeCount');
const completedCnt = document.getElementById('completedCount');
const clearAllBtn  = document.getElementById('clearAllBtn');
const inputWrapper = document.getElementById('inputWrapper');
const filterTabs   = document.querySelectorAll('.tab');
const searchInput  = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const themeToggle  = document.getElementById('themeToggle');
const tagPreview   = document.getElementById('tagPreview');
const prioBtns     = document.querySelectorAll('.prio-btn');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const chartEl      = document.getElementById('chart');
const statsSection = document.getElementById('statsSection');
const exportBtn    = document.getElementById('exportBtn');
const exportMenu   = document.getElementById('exportMenu');
const importBtn    = document.getElementById('importBtn');
const fileInput    = document.getElementById('fileInput');

/* ──────────────────────────────────────────
   4. YARDIMCI FONKSİYONLAR
────────────────────────────────────────── */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bumpEl(el) {
  el.classList.remove('bump');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('bump'));
  });
  el.addEventListener('animationend', () => el.classList.remove('bump'), { once: true });
}

function getTagColor(tag) {
  const colors = ['#FF6B6B', '#56CFB2', '#FFD34F', '#7B5EA7', '#4FC3F7', '#FF8A65', '#81C784', '#BA68C8', '#4DB6AC', '#FFB74D', '#A1887F', '#E57373'];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getDueDateClass(dateStr) {
  if (!dateStr) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'due-today';
  if (diff === 1) return 'due-tomorrow';
  return '';
}

function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return `${Math.abs(diff)} gün gecikti`;
  if (diff === 0) return 'Bugün son gün';
  if (diff === 1) return 'Yarın son gün';
  if (diff <= 7) return `${diff} gün kaldı`;

  const day = due.getDate().toString().padStart(2, '0');
  const month = (due.getMonth() + 1).toString().padStart(2, '0');
  const year = due.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseTags(str) {
  return str.split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

/* ──────────────────────────────────────────
   5. TEMA
────────────────────────────────────────── */
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  Storage.saveTheme(theme);

  const icon = themeToggle.querySelector('i');
  icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

/* ──────────────────────────────────────────
   6. HATA MESAJI
────────────────────────────────────────── */
let errorTimer = null;

function showError(msg = 'Lütfen bir görev girin.') {
  errorText.textContent = msg;
  errorMsg.setAttribute('aria-hidden', 'false');
  errorMsg.classList.add('visible');
  inputWrapper.classList.add('shake');
  inputWrapper.addEventListener('animationend', () => inputWrapper.classList.remove('shake'), { once: true });

  clearTimeout(errorTimer);
  errorTimer = setTimeout(hideError, 2800);
}

function hideError() {
  errorMsg.classList.remove('visible');
  errorMsg.setAttribute('aria-hidden', 'true');
}

/* ──────────────────────────────────────────
   7. ETİKET ÖNİZLEME
────────────────────────────────────────── */
function updateTagPreview() {
  const tags = parseTags(tagsInput.value);
  if (tags.length) {
    tagPreview.innerHTML = tags.map(t =>
      `<span class="tag-badge" style="background:${getTagColor(t)}">${escapeHtml(t)}</span>`
    ).join('');
    tagPreview.classList.add('visible');
  } else {
    tagPreview.classList.remove('visible');
  }
}

/* ──────────────────────────────────────────
   8. RENDER
────────────────────────────────────────── */
function updateStats() {
  const total  = state.tasks.length;
  const done   = state.tasks.filter(t => t.done).length;
  const active = total - done;

  [totalCount, activeCount, completedCnt].forEach(bumpEl);
  totalCount.textContent   = total;
  activeCount.textContent  = active;
  completedCnt.textContent = done;
}

function getFilteredTasks() {
  let tasks = state.tasks;

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    tasks = tasks.filter(t => t.text.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q)));
  }

  switch (state.filter) {
    case 'active':    tasks = tasks.filter(t => !t.done); break;
    case 'completed': tasks = tasks.filter(t => t.done); break;
  }

  return tasks;
}

function render() {
  taskList.innerHTML = '';
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    emptyState.classList.add('visible');
    emptyState.setAttribute('aria-hidden', 'false');
    if (state.searchQuery || state.filter !== 'all') {
      emptyState.querySelector('.empty-title').textContent = 'Eşleşen görev yok';
      emptyState.querySelector('.empty-sub').textContent = 'Filtreyi değiştir veya yeni bir görev ekle.';
    } else {
      emptyState.querySelector('.empty-title').textContent = 'Henüz görev yok';
      emptyState.querySelector('.empty-sub').textContent = 'Yukarıdan yeni bir görev ekleyerek başla.';
    }
  } else {
    emptyState.classList.remove('visible');
    emptyState.setAttribute('aria-hidden', 'true');
    filtered.forEach(task => taskList.appendChild(createTaskEl(task)));
  }

  updateStats();
  updateProgress();
  renderChart();
}

function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = `task-item prio-${task.priority}${task.done ? ' done' : ''}`;
  li.dataset.id = task.id;
  li.setAttribute('role', 'listitem');
  li.draggable = true;

  const dueClass = getDueDateClass(task.dueDate);
  const dueText = formatDueDate(task.dueDate);

  li.innerHTML = `
    <i class="fa-solid fa-grip-vertical drag-handle" title="Sürükle"></i>
    <button class="task-check" aria-label="${task.done ? 'Görevi geri al' : 'Görevi tamamla'}" title="${task.done ? 'Geri al' : 'Tamamla'}">
      <i class="fa-solid fa-check check-icon"></i>
    </button>
    <div class="task-body">
      <span class="task-text" title="Düzenlemek için çift tıkla">${escapeHtml(task.text)}</span>
      <div class="task-meta">
        ${task.tags.length ? `<div class="task-tags">${task.tags.map(t => `<span class="tag-badge" style="background:${getTagColor(t)}">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        ${task.dueDate ? `<span class="task-due ${dueClass}"><i class="fa-regular fa-calendar"></i> ${dueText}</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="action-btn edit" aria-label="Düzenle" title="Düzenle">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="action-btn delete" aria-label="Sil" title="Sil">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;

  li.querySelector('.task-check').addEventListener('click', () => toggleTask(task.id));
  li.querySelector('.action-btn.edit').addEventListener('click', () => startEdit(li, task));
  li.querySelector('.task-text').addEventListener('dblclick', () => startEdit(li, task));
  li.querySelector('.action-btn.delete').addEventListener('click', () => removeTask(task.id, li));

  /* Drag & Drop events */
  li.addEventListener('dragstart', handleDragStart);
  li.addEventListener('dragend', handleDragEnd);
  li.addEventListener('dragover', handleDragOverItem);

  return li;
}

/* ──────────────────────────────────────────
   9. GÖREV İŞLEMLERİ (CRUD)
────────────────────────────────────────── */
function addTask() {
  const text = taskInput.value.trim();

  if (!text) {
    showError('Boş görev eklenemez.');
    taskInput.focus();
    return;
  }
  if (text.length < 2) {
    showError('Görev en az 2 karakter olmalı.');
    return;
  }

  const tags = parseTags(tagsInput.value);
  const dueDate = dateInput.value || null;

  const task = {
    id: uid(),
    text,
    done: false,
    createdAt: Date.now(),
    completedAt: null,
    priority: state.priority,
    tags,
    dueDate,
    order: 0
  };

  state.tasks.unshift(task);
  Storage.save();
  render();
  taskInput.value = '';
  tagsInput.value = '';
  dateInput.value = '';
  tagPreview.classList.remove('visible');
  updateClearDateBtn();
  hideError();
  taskInput.focus();
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  task.completedAt = task.done ? Date.now() : null;
  Storage.save();
  render();
}

function removeTask(id, li) {
  li.classList.add('removing');
  li.addEventListener('animationend', () => {
    state.tasks = state.tasks.filter(t => t.id !== id);
    Storage.save();
    render();
  }, { once: true });
}

function clearAll() {
  if (state.tasks.length === 0) {
    showError('Temizlenecek görev bulunmuyor.');
    return;
  }
  if (!window.confirm('Tüm görevler silinecek. Emin misiniz?')) return;
  state.tasks = [];
  Storage.save();
  render();
}

/* ──────────────────────────────────────────
   10. DÜZENLEME
────────────────────────────────────────── */
function startEdit(li, task) {
  if (task.done) return;

  const textEl = li.querySelector('.task-text');
  const actionsEl = li.querySelector('.task-actions');
  const bodyEl = li.querySelector('.task-body');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-edit-input';
  input.value = task.text;
  input.maxLength = 120;
  input.setAttribute('aria-label', 'Görevi düzenle');

  const saveBtn = document.createElement('button');
  saveBtn.className = 'action-btn save';
  saveBtn.setAttribute('aria-label', 'Kaydet');
  saveBtn.title = 'Kaydet';
  saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';

  textEl.replaceWith(input);
  actionsEl.innerHTML = '';
  actionsEl.appendChild(saveBtn);
  actionsEl.style.opacity = '1';
  input.focus();
  input.select();

  function commitEdit() {
    const newText = input.value.trim();
    if (!newText) { showError('Görev boş bırakılamaz.'); input.focus(); return; }
    if (newText.length < 2) { showError('Görev en az 2 karakter olmalı.'); return; }
    task.text = newText;
    Storage.save();
    render();
  }

  function cancelEdit() {
    render();
  }

  saveBtn.addEventListener('click', commitEdit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  });
  input.addEventListener('blur', () => setTimeout(commitEdit, 150));
}

/* ──────────────────────────────────────────
   11. FİLTRE VE ARAMA
────────────────────────────────────────── */
function setFilter(filter) {
  state.filter = filter;
  filterTabs.forEach(tab => {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive.toString());
  });
  render();
}

function setSearchQuery(query) {
  state.searchQuery = query.trim();
  clearSearchBtn.classList.toggle('visible', !!state.searchQuery);
  render();
}

function clearSearch() {
  searchInput.value = '';
  setSearchQuery('');
  searchInput.focus();
}

/* ──────────────────────────────────────────
   12. SÜRÜKLE-BIRAK
────────────────────────────────────────── */
let dragSrcId = null;

function handleDragStart(e) {
  dragSrcId = this.dataset.id;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
  taskList.classList.add('drag-over');
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  taskList.classList.remove('drag-over');
  document.querySelectorAll('.drag-target-top, .drag-target-bottom').forEach(el => {
    el.classList.remove('drag-target-top', 'drag-target-bottom');
  });
}

function handleDragOverItem(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const target = this;
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;

  document.querySelectorAll('.drag-target-top, .drag-target-bottom').forEach(el => {
    el.classList.remove('drag-target-top', 'drag-target-bottom');
  });

  if (e.clientY < midY) {
    target.classList.add('drag-target-top');
  } else {
    target.classList.add('drag-target-bottom');
  }
}

taskList.addEventListener('drop', function(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  document.querySelectorAll('.drag-target-top, .drag-target-bottom').forEach(el => {
    el.classList.remove('drag-target-top', 'drag-target-bottom');
  });

  const targetLi = e.target.closest('.task-item');
  if (!targetLi || !dragSrcId || targetLi.dataset.id === dragSrcId) {
    dragSrcId = null;
    return;
  }

  const items = [...this.querySelectorAll('.task-item')];
  const dragIdx = state.tasks.findIndex(t => t.id === dragSrcId);
  const dropIdx = state.tasks.findIndex(t => t.id === targetLi.dataset.id);
  if (dragIdx === -1 || dropIdx === -1) { dragSrcId = null; return; }

  const [moved] = state.tasks.splice(dragIdx, 1);
  const newDropIdx = state.tasks.findIndex(t => t.id === targetLi.dataset.id);
  state.tasks.splice(newDropIdx, 0, moved);

  Storage.save();
  render();
  dragSrcId = null;
});

taskList.addEventListener('dragover', function(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});

/* ──────────────────────────────────────────
   13. İLERLEME VE GRAFİK
────────────────────────────────────────── */
function updateProgress() {
  const total = state.tasks.length;
  if (total === 0) {
    progressFill.style.width = '0%';
    progressPercent.textContent = '%0';
    statsSection.classList.remove('visible');
    return;
  }

  statsSection.classList.add('visible');
  const done = state.tasks.filter(t => t.done).length;
  const pct = Math.round((done / total) * 100);
  progressFill.style.width = `${pct}%`;
  progressPercent.textContent = `%${pct}`;
}

function renderChart() {
  chartEl.innerHTML = '';

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('tr-TR', { weekday: 'short' });

    const startOfDay = new Date(dateStr + 'T00:00:00').getTime();
    const endOfDay = new Date(dateStr + 'T23:59:59').getTime();
    const count = state.tasks.filter(t => t.done && t.completedAt && t.completedAt >= startOfDay && t.completedAt <= endOfDay).length;

    days.push({ dayName, count, dateStr });
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);

  days.forEach(day => {
    const col = document.createElement('div');
    col.className = 'chart-col';

    const val = document.createElement('span');
    val.className = 'chart-val';
    val.textContent = day.count;

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    const pct = (day.count / maxCount) * 100;
    bar.style.height = `${Math.max(pct, day.count > 0 ? 10 : 3)}%`;

    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = day.dayName;

    col.appendChild(val);
    col.appendChild(bar);
    col.appendChild(label);
    chartEl.appendChild(col);
  });
}

/* ──────────────────────────────────────────
   14. ÖNCELİK SEÇİMİ
────────────────────────────────────────── */
function setPriority(priority) {
  state.priority = priority;
  prioBtns.forEach(btn => {
    const isActive = btn.dataset.priority === priority;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', isActive.toString());
  });
}

/* ──────────────────────────────────────────
   15. TARİH TEMİZLEME
────────────────────────────────────────── */
function updateClearDateBtn() {
  clearDateBtn.classList.toggle('visible', !!dateInput.value);
}

/* ──────────────────────────────────────────
   16. DIŞA / İÇE AKTARMA
────────────────────────────────────────── */
function exportTasksJSON() {
  if (state.tasks.length === 0) {
    showError('Aktarılacak görev bulunmuyor.');
    return;
  }
  const data = JSON.stringify(state.tasks, null, 2);
  downloadFile(data, 'todo-gorevler.json', 'application/json');
  closeExportMenu();
}

function exportTasksCSV() {
  if (state.tasks.length === 0) {
    showError('Aktarılacak görev bulunmuyor.');
    return;
  }
  const headers = ['id', 'text', 'done', 'createdAt', 'completedAt', 'priority', 'tags', 'dueDate'];
  const rows = state.tasks.map(t => [
    t.id,
    `"${t.text.replace(/"/g, '""')}"`,
    t.done,
    t.createdAt,
    t.completedAt || '',
    t.priority,
    `"${t.tags.join(', ')}"`,
    t.dueDate || ''
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csv, 'todo-gorevler.csv', 'text/csv;charset=utf-8');
  closeExportMenu();
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toggleExportMenu() {
  exportMenu.classList.toggle('visible');
}

function closeExportMenu() {
  exportMenu.classList.remove('visible');
}

function importTasks() {
  closeExportMenu();
  fileInput.click();
}

async function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const ext = file.name.split('.').pop().toLowerCase();
    let imported;

    if (ext === 'csv') {
      imported = parseCSV(text);
    } else if (ext === 'json') {
      imported = JSON.parse(text);
    } else {
      throw new Error('Desteklenmeyen dosya formatı. JSON veya CSV kullanın.');
    }

    if (!Array.isArray(imported) || imported.length === 0) {
      throw new Error('Dosyada geçerli görev bulunamadı.');
    }

    imported = imported.map((t, i) => ({
      id: t.id || uid(),
      text: t.text || '',
      done: t.done || false,
      createdAt: t.createdAt || Date.now(),
      completedAt: t.completedAt || null,
      priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
      tags: Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? parseTags(t.tags) : []),
      dueDate: t.dueDate || null,
      order: t.order ?? i
    }));

    const count = imported.length;
    state.tasks = imported;
    Storage.save();
    render();
    showError(`${count} görev başarıyla içe aktarıldı.`);
    setTimeout(hideError, 2500);
  } catch (err) {
    showError('İçe aktarma başarısız: ' + err.message);
  }

  fileInput.value = '';
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV dosyası en az 2 satır içermeli.');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const tasks = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const task = {};
    headers.forEach((h, idx) => {
      let val = values[idx].trim();
      if (h === 'done') val = val === 'true' || val === '1';
      if (h === 'createdat') h = 'createdAt';
      if (h === 'completedat') h = 'completedAt';
      if (h === 'duedate') h = 'dueDate';
      task[h] = val;
    });
    if (task.text) tasks.push(task);
  }

  return tasks;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/* ──────────────────────────────────────────
   17. EVENT LISTENERS
────────────────────────────────────────── */

/* Ekleme */
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addTask(); }
});
taskInput.addEventListener('input', hideError);

/* Öncelik */
prioBtns.forEach(btn => {
  btn.addEventListener('click', () => setPriority(btn.dataset.priority));
});

/* Etiket önizleme */
tagsInput.addEventListener('input', updateTagPreview);

/* Tarih temizleme */
dateInput.addEventListener('input', updateClearDateBtn);
clearDateBtn.addEventListener('click', () => {
  dateInput.value = '';
  updateClearDateBtn();
});

/* Tema */
themeToggle.addEventListener('click', toggleTheme);

/* Arama */
searchInput.addEventListener('input', e => setSearchQuery(e.target.value));
clearSearchBtn.addEventListener('click', clearSearch);

/* Tümünü temizle */
clearAllBtn.addEventListener('click', clearAll);

/* Filtre sekmeleri */
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => setFilter(tab.dataset.filter));
});

/* Dışa/içe aktarma */
exportBtn.addEventListener('click', toggleExportMenu);
document.querySelectorAll('.export-option').forEach(opt => {
  opt.addEventListener('click', () => {
    if (opt.dataset.format === 'json') exportTasksJSON();
    else exportTasksCSV();
  });
});
importBtn.addEventListener('click', importTasks);
fileInput.addEventListener('change', handleFileImport);

/* Menü dışına tıklayınca kapat */
document.addEventListener('click', e => {
  if (!e.target.closest('.export-group')) {
    closeExportMenu();
  }
});

/* Klavye kısayolları */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === 'Escape') {
    if (searchInput.value) {
      clearSearch();
    } else if (document.activeElement === searchInput) {
      searchInput.blur();
    }
  }
});

/* ──────────────────────────────────────────
   18. UYGULAMA BAŞLATMA
────────────────────────────────────────── */
(function init() {
  Storage.load();
  applyTheme(state.theme);
  render();
  updateClearDateBtn();
  taskInput.focus();
})();
