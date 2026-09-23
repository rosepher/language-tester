import { getCurrentUser } from './supabase.js';

// Проверяем, вошёл ли преподаватель — меняем ссылку
const user = await getCurrentUser();
if (user && user.role === 'teacher') {
  const link = document.getElementById('login-link');
  link.textContent = 'Панель преподавателя';
  link.href = 'teacher/dashboard.html';
}

// === Загрузка тестов ===
async function loadTests() {
  const lang = document.getElementById('filter-lang').value;
  const level = document.getElementById('filter-level').value;

  let query = supabase
    .from('tests')
    .select('*')
    .eq('is_published', true)
    .order('language', { ascending: true })
    .order('level', { ascending: true });

  if (lang) query = query.eq('language', lang);
  if (level) query = query.eq('level', level);

  const { data, error } = await query;

  const list = document.getElementById('tests-list');

  if (error) {
    list.innerHTML = '<p class="muted">Ошибка загрузки: ' + error.message + '</p>';
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="muted">Тестов пока нет. Зайдите позже.</p>';
    return;
  }

  // Подгружаем количество вопросов
  const testIds = data.map(t => t.id);
  const { data: qRows } = await supabase
    .from('questions')
    .select('test_id')
    .in('test_id', testIds);

  const counts = {};
  (qRows || []).forEach(q => {
    counts[q.test_id] = (counts[q.test_id] || 0) + 1;
  });

  list.innerHTML = data.map(t => {
    const flag = t.language === 'english' ? '🇬🇧' : '🇪🇸';
    const count = counts[t.id] || 0;
    const disabled = count === 0 ? 'disabled style="opacity:.5;cursor:not-allowed;"' : '';

    return `
      <div class="lang-card">
        <div class="flag">${flag}</div>
        <h2>${t.title}</h2>
        <p class="muted">${t.description || t.language + ' · ' + t.level.toUpperCase()}</p>
        <p class="muted" style="font-size:.85rem;">
          ${count} ${count === 1 ? 'вопрос' : (count < 5 ? 'вопроса' : 'вопросов')}
        </p>
        <button 
          class="btn" 
          onclick="startTest(${t.id})"
          ${disabled}>
          ${count === 0 ? 'Нет вопросов' : 'Начать тест →'}
        </button>
      </div>
    `;
  }).join('');
}

// Переход к тесту с проверкой имени
window.startTest = function (lang, level) {
  const nameInput = document.getElementById('student-name');
  const name = nameInput.value.trim();

  if (!name) {
    alert('Пожалуйста, введите имя перед началом теста');
    nameInput.focus();
    return;
  }

  sessionStorage.setItem('student_name', name);
  window.location.href = `test.html?lang=${lang}&level=${level}`;
};

// === Фильтры ===
document.getElementById('filter-lang').onchange = loadTests;
document.getElementById('filter-level').onchange = loadTests;

// === Старт ===
loadTests();