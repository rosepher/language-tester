import { supabase } from './supabase.js';

// === Перемешивание массива (Фишер—Йетс) ===
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// === Параметры ===
const params = new URLSearchParams(location.search);
const lang = params.get('lang') || 'english';
const level = params.get('level') || 'a2';
const studentName = sessionStorage.getItem('student_name') || 'Аноним';
const shuffleEnabled = params.get('shuffle') !== '0';

// === Состояние ===
let questions = [];
let current = 0;
let score = 0;
let answers = [];
let timeLeft = 900;
let timerInterval = null;
let answered = false;

// ==========================================
// ЗАГРУЗКА ТЕСТА
// ==========================================
async function loadTest() {
  console.log('=== loadTest START ===', { lang, level, studentName, shuffleEnabled });

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('language', lang)
    .eq('level', level);

  if (error) {
    console.error('Ошибка загрузки:', error);
    document.querySelector('.question-box').innerHTML =
      '<p>Ошибка загрузки теста: ' + error.message + '</p>' +
      '<a href="index.html" class="btn">На главную</a>';
    return;
  }

  if (!data || data.length === 0) {
    document.querySelector('.question-box').innerHTML =
      '<p>Вопросы для этого теста не найдены.</p>' +
      '<a href="index.html" class="btn">На главную</a>';
    return;
  }

  // Формируем вопросы с перемешанными вариантами
  questions = data.map(q => {
    const opts = [
      { text: q.option_a, correct: q.correct_option === 'a' },
      { text: q.option_b, correct: q.correct_option === 'b' },
      { text: q.option_c, correct: q.correct_option === 'c' },
      { text: q.option_d, correct: q.correct_option === 'd' }
    ];
    const shuffled = shuffleEnabled ? shuffle(opts) : opts;
    return {
      id: q.id,
      question: q.question_text,
      options: shuffled.map(o => o.text),
      correct: shuffled.findIndex(o => o.correct),
      explanation: q.explanation || ''
    };
  });

  // Перемешиваем порядок вопросов
  if (shuffleEnabled) {
    questions = shuffle(questions);
  }

  console.log('Вопросов загружено:', questions.length,
    shuffleEnabled ? '(с рандомизацией)' : '(без рандомизации)');

  document.getElementById('test-title').textContent =
    `${lang === 'english' ? 'English' : 'Español'} ${level.toUpperCase()}`;

  startTimer();
  renderQuestion();
}

// ==========================================
// ТАЙМЕР
// ==========================================
function startTimer() {
  const timerEl = document.getElementById('timer');
  timerInterval = setInterval(() => {
    timeLeft--;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    if (timeLeft <= 60) timerEl.classList.add('warning');
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      finishTest();
    }
  }, 1000);
}

// ==========================================
// ОТРИСОВКА ВОПРОСА
// ==========================================
function renderQuestion() {
  answered = false;
  const q = questions[current];

  document.getElementById('counter').textContent =
    `Вопрос ${current + 1} из ${questions.length}`;
  document.getElementById('progress').style.width =
    (current / questions.length * 100) + '%';
  document.getElementById('question').textContent = q.question;

  const feedback = document.getElementById('feedback');
  feedback.textContent = '';
  feedback.className = 'feedback';
  document.getElementById('next-btn').style.display = 'none';

  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = `${'ABCD'[i]}) ${opt}`;
    btn.onclick = () => selectAnswer(i);
    optionsDiv.appendChild(btn);
  });
}

// ==========================================
// ОБРАБОТКА ОТВЕТА
// ==========================================
function selectAnswer(index) {
  if (answered) return;
  answered = true;

  const q = questions[current];
  const isCorrect = index === q.correct;
  const buttons = document.querySelectorAll('.option-btn');

  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct) b.classList.add('correct');
    if (i === index && !isCorrect) b.classList.add('wrong');
  });

  const feedback = document.getElementById('feedback');
  if (isCorrect) {
    score++;
    feedback.textContent = '✅ Правильно!' + (q.explanation ? ' ' + q.explanation : '');
    feedback.className = 'feedback correct';
  } else {
    feedback.textContent =
      `❌ Неправильно. Верно: ${'ABCD'[q.correct]}) ${q.options[q.correct]}.` +
      (q.explanation ? ' ' + q.explanation : '');
    feedback.className = 'feedback wrong';
  }

  answers.push({
    questionId: q.id,
    question: q.question,
    userAnswer: q.options[index],
    userAnswerLetter: 'abcd'[index],
    correctAnswer: q.options[q.correct],
    isCorrect: isCorrect
  });

  const nextBtn = document.getElementById('next-btn');
  nextBtn.style.display = 'block';
  nextBtn.textContent = current === questions.length - 1 ? 'Завершить →' : 'Далее →';
}

// ==========================================
// КНОПКА «ДАЛЕЕ»
// ==========================================
document.getElementById('next-btn').onclick = () => {
  current++;
  if (current < questions.length) {
    renderQuestion();
  } else {
    finishTest();
  }
};

// ==========================================
// ЗАВЕРШЕНИЕ
// ==========================================
async function finishTest() {
  clearInterval(timerInterval);
  document.getElementById('progress').style.width = '100%';

  console.log('=== finishTest START ===');
  console.log('studentName:', studentName, 'lang:', lang, 'level:', level);
  console.log('score:', score, 'total:', questions.length);

  const percent = Math.round((score / questions.length) * 100);

  console.log('=== RPC save_attempt ===');
  const { data: attemptId, error: err1 } = await supabase.rpc('save_attempt', {
    p_student_name: studentName,
    p_language: lang,
    p_level: level,
    p_score: score,
    p_total: questions.length,
    p_percent: percent
  });

  console.log('attemptId:', attemptId, 'error:', err1);

  if (attemptId && !err1) {
    const rows = answers.map(a => ({
      attempt_id: attemptId,
      question_id: a.questionId,
      user_answer: a.userAnswerLetter,
      is_correct: a.isCorrect
    }));

    console.log('=== RPC save_attempt_answers ===');
    const { error: err2 } = await supabase.rpc('save_attempt_answers', {
      p_rows: rows
    });
    console.log('answers error:', err2);
  }

  sessionStorage.setItem('lastResult', JSON.stringify({
    studentName,
    language: lang,
    level,
    score,
    total: questions.length,
    percent,
    answers
  }));

  if (err1) {
    alert('ОШИБКА СОХРАНЕНИЯ: ' + err1.message);
    console.error(err1);
  }

  setTimeout(() => {
    window.location.href = 'result.html';
  }, 800);
}

loadTest();
