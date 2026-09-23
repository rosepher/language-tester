import { supabase, requireTeacher } from './supabase.js';

const user = await requireTeacher();
if (!user) throw new Error('Доступ запрещён');

// === Получаем test_id из URL ===
const params = new URLSearchParams(location.search);
const testId = params.get('test_id');

if (!testId) {
  document.querySelector('main').innerHTML =
    '<h1>Ошибка</h1><p>Не указан ID теста.</p><a href="tests.html" class="btn">К списку тестов</a>';
  throw new Error('test_id не указан');
}

let currentTest = null;

// === Logout ===
document.getElementById('logout-btn').onclick = async () => {
  await supabase.auth.signOut();
  window.location.href = '../index.html';
};

// === Загрузка теста (для заголовка) ===
async function loadTestInfo() {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (error || !data) {
    document.querySelector('main').innerHTML =
      '<h1>Тест не найден</h1><a href="tests.html" class="btn">К списку тестов</a>';
    return false;
  }

  currentTest = data;

  document.getElementById('test-title').textContent = data.title;
  document.getElementById('test-info').textContent =
    `${data.language === 'english' ? 'English' : 'Español'} · ${data.level.toUpperCase()}` +
    (data.is_published ? '' : ' · черновик');

  return true;
}

// === Загрузка вопросов теста ===
async function loadQuestions() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('test_id', testId)
    .order('id', { ascending: false });

  if (error) {
    document.getElementById('questions-list').textContent = 'Ошибка: ' + error.message;
    return;
  }

  const list = document.getElementById('questions-list');
  if (!data.length) {
    list.innerHTML = '<p class="muted">В этом тесте пока нет вопросов. Нажмите «Добавить вопрос».</p>';
    return;
  }

  list.innerHTML = data.map((q, i) => `
    <div class="question-item">
      <div class="question-header">
        <span class="badge">Вопрос ${data.length - i}</span>
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

// === Показать форму добавления ===
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
    question_text: document.getElementById('q-text').value.trim(),
    option_a: document.getElementById('q-a').value.trim(),
    option_b: document.getElementById('q-b').value.trim(),
    option_c: document.getElementById('q-c').value.trim(),
    option_d: document.getElementById('q-d').value.trim(),
    correct_option: document.getElementById('q-correct').value,
    explanation: document.getElementById('q-explanation').value.trim()
  };

  const errorEl = document.getElementById('form-error');
  let error;

  if (id) {
    // Обновление — не меняем test_id, language, level
    ({ error } = await supabase.from('questions').update(payload).eq('id', id));
  } else {
    // Создание — наследуем language, level и test_id от текущего теста
    payload.language = currentTest.language;
    payload.level = currentTest.level;
    payload.test_id = currentTest.id;
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

// === Старт ===
(async () => {
  const ok = await loadTestInfo();
  if (ok) loadQuestions();
})();