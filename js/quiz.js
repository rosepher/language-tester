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

// === Параметры из URL ===
const params = new URLSearchParams(location.search);
const testId = params.get('test_id');
const studentName = sessionStorage.getItem('student_name') || 'Аноним';
const shuffleEnabled = params.get('shuffle') !== '0';

if (!testId) {
  document.querySelector('.question-box').innerHTML =
    '<p>Не указан тест. Вернитесь на главную.</p>' +
    '<a href="index.html" class="btn">На главную</a>';
  throw new Error('test_id не указан');
}

// === Состояние ===
let currentTest = null;
let questions = [];
let current = 0;
let score = 0;
let answers = [];
let timeLeft = 900; // 15 минут
let timerInterval = null;
let answered = false;

// ==========================================
// ЗАГРУЗКА ТЕСТА
// ==========================================
async function loadTest() {
  console.log('=== loadTest START ===', { testId, studentName, shuffleEnabled });

  // 1. Загружаем информацию о тесте
  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (testError || !test) {
    console.error('Ошибка загрузки теста:', testError);
    document.querySelector('.question-box').innerHTML =
      '<p>Тест не найден.</p><a href="index.html" class="btn">На главную</a>';
    return;
  }

  if (!test.is_published) {
    document.querySelector('.question-box').innerHTML =
      '<p>Этот тест ещё не опубликован.</p><a href="index.html" class="btn">На главную</a>';
    return;
  }

  currentTest = test;

  // 2. Загружаем вопросы теста
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('test_id', testId);

  if (error) {
    console.error('Ошибка загрузки вопросов:', error);
    document.querySelector('.question-box').innerHTML =
      '<p>Ошибка загрузки вопросов: ' + error.message + '</p>' +
      '<a href="index.html" class="btn">На главную</a>';
    return;
  }

  if (!data || data.length === 0) {
    document.querySelector('.question-box').innerHTML =
      '<p>В этом тесте пока нет вопросов.</p>' +
      '<a href="index.html" class="btn">На главную</a>';
    return;
  }

  // 3. Формируем вопросы с перемешанными вариантами
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

  // 4. Перемешиваем порядок вопросов
  if (shuffleEnabled) {
    questions = shuffle(questions);
  }

  console.log('Вопросов загружено:', questions.length,
    shuffleEnabled ? '(с рандомизацией)' : '(без рандомизации)');

  // 5. Заголовок страницы
  document.getElementById('test-title').textContent = test.title;
  document.title = test.title + ' — LangTest';

  // 6. Таймер и первый вопрос
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
  console.log('studentName:', studentName, 'testId:', testId);
  console.log('score:', score, 'total:', questions.length);

  const percent = Math.round((score / questions.length) * 100);

  // === Сохраняем попытку через RPC (сразу с test_id) ===
  console.log('=== RPC save_attempt ===');
  const { data: attemptId, error: err1 } = await supabase.rpc('save_attempt', {
    p_student_name: studentName,
    p_language: currentTest.language,
    p_level: currentTest.level,
    p_score: score,
    p_total: questions.length,
    p_percent: percent,
    p_test_id: currentTest.id
  });

  console.log('attemptId:', attemptId, 'error:', err1);

  // === Сохраняем ответы на каждый вопрос ===
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

  // === Сохраняем результат для страницы result.html ===
  sessionStorage.setItem('lastResult', JSON.stringify({
    studentName,
    testTitle: currentTest.title,
    language: currentTest.language,
    level: currentTest.level,
    score,
    total: questions.length,
    percent,
    answers
  }));

  if (err1) {
    alert('ОШИБКА СОХРАНЕНИЯ: ' + err1.message);
    console.error(err1);
  }

  console.log('=== REDIRECT TO result.html ===');

  setTimeout(() => {
    window.location.href = 'result.html';
  }, 800);
}

// ==========================================
// СТАРТ
// ==========================================
loadTest();