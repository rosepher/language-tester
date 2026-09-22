import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ⚠️ ЗАМЕНИТЕ НА СВОИ ЗНАЧЕНИЯ
const SUPABASE_URL = 'https://esxyxfyqbdcwmlifhsmp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzeHl4ZnlxYmRjd21saWZoc21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwODY0NjEsImV4cCI6MjEwNTY2MjQ2MX0.E5yX9s7Ly4GWlX1C5s2WmxskxD0W1OWUSdFgR81Qh6k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Получить текущего пользователя с профилем
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { ...user, ...profile };
}

// Проверка: только преподаватель
export async function requireTeacher() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    window.location.href = '/login.html';
    return null;
  }
  return user;
}