async function finishTest() {
  clearInterval(timerInterval);
  document.getElementById('progress').style.width = '100%';

  console.log('=== finishTest START ===');
  console.log('studentName:', studentName, 'lang:', lang, 'level:', level);

  const percent = Math.round((score / questions.length) * 100);

  // === Сохраняем попытку через RPC-функцию ===
  console.log('=== RPC save_attempt ===');
  const { data: attemptId, error: err1 } = await supabase.rpc('save_attempt', {
    p_student_name: studentName,
    p_language: lang,
    p_level: level,
    p_score: score,
    p_total: questions.length,
    p_percent: percent
  });

  console.log('attemptId:', attemptId);
  console.log('error:', err1);

  // === Сохраняем ответы через RPC-функцию ===
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

  // === Для страницы результата ===
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
