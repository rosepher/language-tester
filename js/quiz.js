import { supabase } from './supabase.js';

const params = new URLSearchParams(location.search);
const lang = params.get('lang') || 'english';
const level = params.get('level') || 'a2';
const studentName = sessionStorage.getItem('student_name') || 'Аноним';

let questions = [];
let current = 0;
let score = 0;
let answers = [];
let timeLeft = 900;
let timerInterval = null;
let answered = false;

async function loadTest() {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('language', lang)
    .eq('level', level);

  if (error || !data || data.length === 0) {
    document.querySelector('.question-box').innerHTML =
      '<p>Ошибка загрузки теста. Попробуйте позже.</p><a href="index.html" class="btn">На главную</a>';
    return;
  }

  questions = data.map(q => ({
    id: q.id,
    question: q.question_text,
    options: [q.option_a, q.option_b, q.option_c, q.option_d],
    correct: 'abcd'.indexOf(q.correct_option),
    explanation: q.explanation || ''
  }));

  document.getElementById('test-title').textContent =
    `${lang === 'english' ? 'English' : 'Español'} ${level.toUpperCase()}`;

  startTimer();
  renderQuestion();
}

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
    feedback.textContent = `❌ Неправильно. Верно: ${'ABCD'[q.correct]}) ${q.options[q.correct]}.` +
      (q.explanation ? ' ' + q.explanation : '');
    feedback.className = 'feedback wrong';
  }

  answers.push({
    questionId: q.id,
    question: q.question,
    userAnswer: q.options[index],
    userAnswerLetter: 'abcd'[index],
    correctAnswer: q.options[q.correct],
    isCorrect
  });

  const nextBtn = document.getElementById('next-btn');
  nextBtn.style.display = 'block';
  nextBtn.textContent = current === questions.length - 1 ? 'Завершить →' : 'Далее →';
}

document.getElementById('next-btn').onclick = () => {
  current++;
  if (current < questions.length) renderQuestion();
  else finishTest();
};

async function finishTest() {
  clearInterval(timerInterval);
  document.getElementById('progress').style.width = '100%';

  console.log('=== finishTest START ===');
  console.log('studentName:', studentName, 'lang:', lang, 'level:', level);
  console.log('score:', score, 'total:', questions.length);

  const percent = Math.round((score / questions.length) * 100);

  console.log('=== INSERT INTO attempts ===');
  const { data: attempt, error: err1 } = await supabase
    .from('attempts')
    .insert({
      student_name: studentName,
      language: lang,
      level: level,
      score: score,
      total: questions.length,
      percent: percent
    })
    .select()
    .single();

  console.log('attempt:', attempt);
  console.log('attempt error:', err1);

  if (attempt && !err1) {
    const rows = answers.map(a => ({
      attempt_id: attempt.id,
      question_id: a.questionId,
      user_answer: a.userAnswerLetter,
      is_correct: a.isCorrect
    }));

    console.log('=== INSERT INTO attempt_answers ===');
    const { data: ans, error: err2 } = await supabase
      .from('attempt_answers')
      .insert(rows)
      .select();

    console.log('answers:', ans);
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

  if (err1 || !attempt) {
    alert('ОШИБКА СОХРАНЕНИЯ: ' + (err1?.message || 'attempt = null') +
      '\nПроверьте консоль (F12)');
  }

  console.log('=== REDIRECT TO result.html ===');

  setTimeout(() => {
    window.location.href = 'result.html';
  }, 800);
}

loadTest();
