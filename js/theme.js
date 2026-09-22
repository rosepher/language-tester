// js/theme.js

// Функция переключения
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateButton();
}

// Обновляем иконку кнопки
function updateButton() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const current = document.documentElement.getAttribute('data-theme');
  btn.textContent = current === 'dark' ? '☀️' : '🌙';
  btn.title = current === 'dark' ? 'Светлая тема' : 'Тёмная тема';
}

// Автоматически инициализируем кнопку, если она есть на странице
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    updateButton();
    btn.addEventListener('click', toggleTheme);
  }
});

// Следим за системной темой (если пользователь не выбрал вручную)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    updateButton();
  }
});