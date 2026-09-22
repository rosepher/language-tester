import { supabase, getCurrentUser } from './supabase.js';

// Если уже вошёл — сразу в панель
const currentUser = await getCurrentUser();
if (currentUser && currentUser.role === 'teacher') {
  window.location.href = 'teacher/dashboard.html';
}

document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = 'Ошибка: ' + error.message;
    return;
  }

  // Проверяем роль
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profile?.role !== 'teacher') {
    await supabase.auth.signOut();
    errorEl.textContent = 'У вас нет прав преподавателя';
    return;
  }

  window.location.href = 'teacher/dashboard.html';
};