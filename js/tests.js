import { supabase, requireTeacher } from './supabase.js';

const user = await requireTeacher();
if (!user) throw new Error('Доступ запрещён');

// === Logout ===
document.getElementById('logout-btn').onclick = async () => {
  await supabase.auth.signOut();
  window.location.href = '../index.html';
};

// === Загрузка тестов ===
async function loadTests() {
  const lang = document.getElementById('filter-lang').value;
  const level = document.getElementById('filter-level').value;

  let query = supabase
    .from('tests')
    .select('*')
    .order('id', { ascending: false });

  if (lang) query = query.eq('language', lang);
  if (level) query = query.eq('level', level);

  const { data, error } = await query;

  if (error) {
    document.getElementById('tests-list').textContent = 'Ошибка: ' + error.message;
    return;
  }

  const list = document.getElementById('tests-list');
  if (!data.length) {
    list.innerHTML = '<p class="muted">Тестов нет. Нажмите «Добавить тест».</p>';
    return;
  }

  // Подгружаем количество вопросов для каждого теста
  const testIds = data.map(t => t.id);
  const { data: qCounts } = await supabase
    .from('questions')
    .select('test_id')
    .in('test_id', testIds);

  const counts = {};
  (qCounts || []).forEach(q => {
    counts[q.test_id] = (counts[q.test_id] || 0) + 1;
  });

  list.innerHTML = data.map(t => `
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

// === Показать форму ===
document.getElementById('add-btn').onclick = () => {
  resetForm();
  document.getElementById('form-title').textContent = 'Новый тест';
  document.getElementById('form-container').style.display = 'block';
  document.getElementById('t-title').focus();
};

document.getElementById('cancel-btn').onclick = () => {
  document.getElementById('form-container').style.display = 'none';
};

function resetForm() {
  document.getElementById('test-form').reset();
  document.getElementById('t-id').value = '';
  document.getElementById('t-published').checked = true;
  document.getElementById('form-error').textContent = '';
}

// === Сохранить ===
document.getElementById('test-form').onsubmit = async (e) => {
  e.preventDefault();

  const id = document.getElementById('t-id').value;
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
    errorEl.textContent = 'Ошибка: ' + error.message;
    return;
  }

  document.getElementById('form-container').style.display = 'none';
  resetForm();
  loadTests();
};

// === Редактировать ===
window.editTest = async (id) => {
  const { data } = await supabase.from('tests').select('*').eq('id', id).single();
  if (!data) return;

  document.getElementById('t-id').value = data.id;
  document.getElementById('t-title').value = data.title;
  document.getElementById('t-description').value = data.description || '';
  document.getElementById('t-lang').value = data.language;
  document.getElementById('t-level').value = data.level;
  document.getElementById('t-published').checked = data.is_published;

  document.getElementById('form-title').textContent = 'Редактировать тест';
  document.getElementById('form-container').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// === Удалить ===
window.deleteTest = async (id) => {
  if (!confirm('Удалить тест и все его вопросы?')) return;
  const { error } = await supabase.from('tests').delete().eq('id', id);
  if (error) { alert('Ошибка: ' + error.message); return; }
  loadTests();
};

// === Фильтры ===
document.getElementById('filter-lang').onchange = loadTests;
document.getElementById('filter-level').onchange = loadTests;

loadTests();