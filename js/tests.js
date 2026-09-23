import { supabase, requireTeacher } from './supabase.js';

const user = await requireTeacher();
if (!user) throw new Error('Доступ запрещён');

const testsList = document.getElementById('tests-list');
if (!testsList) {
  console.error('tests.html устарел — нет #tests-list');
  throw new Error('Неверная страница');
}

console.log('✅ tests.js загружен');

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = '../index.html';
  };
}

async function loadTests() {
  const langEl = document.getElementById('filter-lang');
  const levelEl = document.getElementById('filter-level');
  const lang = langEl ? langEl.value : '';
  const level = levelEl ? levelEl.value : '';

  let query = supabase.from('tests').select('*').order('id', { ascending: false });
  if (lang) query = query.eq('language', lang);
  if (level) query = query.eq('level', level);

  const { data, error } = await query;

  if (error) {
    testsList.textContent = 'Ошибка: ' + error.message;
    return;
  }

  if (!data.length) {
    testsList.innerHTML = '<p class="muted">Тестов нет. Нажмите «Добавить тест».</p>';
    return;
  }

  const testIds = data.map(t => t.id);
  const { data: qCounts } = await supabase
    .from('questions')
    .select('test_id')
    .in('test_id', testIds);

  const counts = {};
  (qCounts || []).forEach(q => {
    counts[q.test_id] = (counts[q.test_id] || 0) + 1;
  });

  testsList.innerHTML = data.map(t => `
    <div class="question-item">
      <div class="question-header">
        <div>
          <span class="badge">${t.language} ${t.level.toUpperCase()}</span>
          ${t.is_published 
            ? '<span class="badge" style="background:var(--correct);color:#059669;">опубликован</span>' 
            : '<span class="badge" style="background:var(--wrong);color:#dc2626;">черновик</span>'}
        </div>
        <div class="question-actions">
          <a href="questions.html?test_id=${t.id}" class="btn-small" style="text-decoration:none;">📝 Вопросы (${counts[t.id] || 0})</a>
          <button onclick="editTest(${t.id})" class="btn-small">✏️</button>
          <button onclick="deleteTest(${t.id})" class="btn-small btn-danger">🗑️</button>
        </div>
      </div>
      <p><strong>${t.title}</strong></p>
      ${t.description ? `<p class="muted">${t.description}</p>` : ''}
    </div>
  `).join('');
}

const addBtn = document.getElementById('add-btn');
const formContainer = document.getElementById('form-container');
const formTitle = document.getElementById('form-title');
const testForm = document.getElementById('test-form');

function resetForm() {
  if (testForm) testForm.reset();
  const tId = document.getElementById('t-id');
  if (tId) tId.value = '';
  const tPub = document.getElementById('t-published');
  if (tPub) tPub.checked = true;
  const err = document.getElementById('form-error');
  if (err) err.textContent = '';
}

if (addBtn && formContainer) {
  addBtn.onclick = () => {
    resetForm();
    if (formTitle) formTitle.textContent = 'Новый тест';
    formContainer.style.display = 'block';
    const tTitle = document.getElementById('t-title');
    if (tTitle) tTitle.focus();
  };
}

const cancelBtn = document.getElementById('cancel-btn');
if (cancelBtn && formContainer) {
  cancelBtn.onclick = () => {
    formContainer.style.display = 'none';
  };
}

if (testForm) {
  testForm.onsubmit = async (e) => {
    e.preventDefault();

    const idEl = document.getElementById('t-id');
    const id = idEl ? idEl.value : '';

    const payload = {
      title: document.getElementById('t-title').value.trim(),
      description: document.getElementById('t-description').value.trim(),
      language: document.getElementById('t-lang').value,
      level: document.getElementById('t-level').value,
      is_published: document.getElementById('t-published').checked
    };

    const errorEl = document.getElementById('form-error');
    let error;

    if (id) {
      ({ error } = await supabase.from('tests').update(payload).eq('id', id));
    } else {
      payload.teacher_id = user.id;
      ({ error } = await supabase.from('tests').insert(payload));
    }

    if (error) {
      if (errorEl) errorEl.textContent = 'Ошибка: ' + error.message;
      return;
    }

    if (formContainer) formContainer.style.display = 'none';
    resetForm();
    loadTests();
  };
}

window.editTest = async (id) => {
  const { data } = await supabase.from('tests').select('*').eq('id', id).single();
  if (!data) return;

  const set = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.value = val;
  };

  set('t-id', data.id);
  set('t-title', data.title);
  set('t-description', data.description || '');
  set('t-lang', data.language);
  set('t-level', data.level);

  const tPub = document.getElementById('t-published');
  if (tPub) tPub.checked = data.is_published;

  if (formTitle) formTitle.textContent = 'Редактировать тест';
  if (formContainer) formContainer.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteTest = async (id) => {
  if (!confirm('Удалить тест и все его вопросы?')) return;
  const { error } = await supabase.from('tests').delete().eq('id', id);
  if (error) { alert('Ошибка: ' + error.message); return; }
  loadTests();
};

const filterLang = document.getElementById('filter-lang');
const filterLevel = document.getElementById('filter-level');
if (filterLang) filterLang.onchange = loadTests;
if (filterLevel) filterLevel.onchange = loadTests;

loadTests();