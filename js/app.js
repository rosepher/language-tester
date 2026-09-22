import { getCurrentUser } from './supabase.js';

// Проверяем, вошёл ли преподаватель — меняем ссылку
const user = await getCurrentUser();
if (user && user.role === 'teacher') {
  const link = document.getElementById('login-link');
  link.textContent = 'Панель преподавателя';
  link.href = 'teacher/dashboard.html';
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

// Переключение темы
document.getElementById('themeToggle').addEventListener('click', function() {
    const currentTheme = document.body.className;
    if (currentTheme === 'light-theme') {
        document.body.className = 'dark-theme';
    } else {
        document.body.className = 'light-theme';
    }
});