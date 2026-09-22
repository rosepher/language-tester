import { supabase, requireTeacher } from './supabase.js';

const user = await requireTeacher();
if (!user) throw new Error('Доступ запрещён');

// === Logout ===
document.getElementById('logout-btn').onclick = async () => {
  await supabase.auth.signOut();
  window.location.href = '../index.html';
};

// === Загрузка вопросов ===
async function loadQuestions() {
  const lang = document.getElementById('filter-lang').value;
  const level = document.getElementById('filter-level').value;

  let query = supabase.from('questions').select('*').order('id', { ascending: false });
  if (lang) query = query.eq('language', lang);
  if (level) query = query.eq('level', level);

  const { data, error } = await query;
  if (error) {
    document.getElementById('questions-list').textContent = 'Ошибка: ' + error.message;
    return;
  }

  const list = document.getElementById('questions-list');
  if (!data.length) {
    list.innerHTML = '<p class="muted">Вопросов нет</p>';
    return;
  }

  list.innerHTML = data.map(q => `
    <div class="question-item">
      <div class="question-header">
        <span class="badge">${q.language} ${q.level.toUpperCase()}</span>
        <div class="question-actions">
          <button onclick="editQuestion(${q.id})" class="btn-small">✏️</button>
          <button onclick="deleteQuestion(${q.id})" class="btn-small btn-danger">🗑️</button>
        </div>
      </div>
      <p><strong>${q.question_text}</strong></p>
      <p class="muted">A) ${q.option_a} · B) ${q.option_b} · C) ${q.option_c} · D) ${q.option_d}</p>
      <p class="muted">Правильно: <strong>${q.correct_option.toUpperCase()}</strong>${q.explanation ? ' — ' + q.explanation : ''}</p>
    </div>
  `).join('');
}

// === Показать форму ===
document.getElementById('add-btn').onclick = () => {
  resetForm();
  document.getElementById('form-title').textContent = 'Новый вопрос';
  document.getElementById('form-container').style.display = 'block';
  document.getElementById('q-text').focus();
};

document.getElementById('cancel-btn').onclick = () => {
  document.getElementById('form-container').style.display = 'none';
};

function resetForm() {
  document.getElementById('question-form').reset();
  document.getElementById('q-id').value = '';
  document.getElementById('form-error').textContent = '';
}

// === Сохранить (создать или обновить) ===
document.getElementById('question-form').onsubmit = async (e) => {
  e.preventDefault();

  const id = document.getElementById('q-id').value;
  const payload = {
    language: document.getElementById('q-lang').value,
    level: document.getElementById('q-level').value,
    question_text: document.getElementById('q-text').value,
    option_a: document.getElementById('q-a').value,
    option_b: document.getElementById('q-b').value,
    option_c: document.getElementById('q-c').value,
    option_d: document.getElementById('q-d').value,
    correct_option: document.getElementById('q-correct').value,
    explanation: document.getElementById('q-explanation').value
  };

  const errorEl = document.getElementById('form-error');

  let error;
  if (id) {
    ({ error } = await supabase.from('questions').update(payload).eq('id', id));
  } else {
    payload.created_by = user.id;
    ({ error } = await supabase.from('questions').insert(payload));
  }

  if (error) {
    errorEl.textContent = 'Ошибка: ' + error.message;
    return;
  }

  document.getElementById('form-container').style.display = 'none';
  resetForm();
  loadQuestions();
};

// === Редактировать ===
window.editQuestion = async (id) => {
  const { data } = await supabase.from('questions').select('*').eq('id', id).single();
  if (!data) return;

  document.getElementById('q-id').value = data.id;
  document.getElementById('q-lang').value = data.language;
  document.getElementById('q-level').value = data.level;
  document.getElementById('q-text').value = data.question_text;
  document.getElementById('q-a').value = data.option_a;
  document.getElementById('q-b').value = data.option_b;
  document.getElementById('q-c').value = data.option_c;
  document.getElementById('q-d').value = data.option_d;
  document.getElementById('q-correct').value = data.correct_option;
  document.getElementById('q-explanation').value = data.explanation || '';

  document.getElementById('form-title').textContent = 'Редактировать вопрос';
  document.getElementById('form-container').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// === Удалить ===
window.deleteQuestion = async (id) => {
  if (!confirm('Удалить вопрос?')) return;
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) { alert('Ошибка: ' + error.message); return; }
  loadQuestions();
};

// === Фильтры ===
document.getElementById('filter-lang').onchange = loadQuestions;
document.getElementById('filter-level').onchange = loadQuestions;

loadQuestions();