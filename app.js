// ============================================================
// ТЕМЫ. Каждая тема лежит в отдельном файле в папке topics/
// и добавляется в этот массив через TOPICS.push({...})
// ============================================================
const TOPICS = [];

// ============================================================
// ЛОГИКА САЙТА
// ============================================================
const STORAGE_KEY = 'ege_progress_v1';
let progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getStatus(topicId) {
  const p = progress[topicId];
  if (!p) return { label: 'Не начата', cls: '' };
  if (p.testCompleted) {
    const passed = p.score >= 7;
    return {
      label: `Тест пройден: ${p.score}/${p.total}`,
      cls: passed ? 'done-test' : 'failed-test'
    };
  }
  if (p.lectureViewed) return { label: 'Лекция просмотрена', cls: 'done-lecture' };
  return { label: 'Не начата', cls: '' };
}

function renderSubject(subject) {
  const content = document.getElementById('content');
  
  // Обычные темы (исключаем пробники)
  const topics = TOPICS.filter(t => t.subject === subject && !t.isProbnik);
  
  // Пробники
  const probniki = TOPICS.filter(t => t.subject === subject && t.isProbnik);

  if (topics.length === 0 && probniki.length === 0) {
    content.innerHTML = '<p class="empty-msg">Тем пока нет. Добавь файлы тем в папку topics и подключи их в index.html.</p>';
    return;
  }

  const byWeek = {};
  topics.forEach(t => {
    if (!byWeek[t.week]) byWeek[t.week] = [];
    byWeek[t.week].push(t);
  });

  const weeks = Object.keys(byWeek).sort((a, b) => a - b);
  let html = '';

  // Блок общего повторения пройденного
  const passedTopics = topics.filter(t => progress[t.id] && (progress[t.id].lectureViewed || progress[t.id].testCompleted));
  if (passedTopics.length > 0) {
    html += `
      <div class="card review-card" style="margin-bottom: 24px; background: #faf5ff; border-left: 4px dashed #8b5cf6;">
        <h3>🔄 Повторение пройденного</h3>
        <p class="status">Собрать тест из вопросов всех пройденных тем (${passedTopics.length} шт.)</p>
        <div class="btn-row">
          <button class="btn primary" data-global-review="${subject}">Пройти повторение</button>
        </div>
      </div>`;
  }

  // Вывод обычных тем по неделям
  weeks.forEach(w => {
    html += `<h2 class="week-title">Неделя ${w}</h2><div class="cards">`;
    byWeek[w].forEach(t => {
      const status = getStatus(t.id);
      html += `
        <div class="card ${status.cls}">
          <h3>${t.title}</h3>
          <p class="status">${status.label}</p>
          <div class="btn-row">
            <button class="btn secondary" data-lecture="${t.id}">📖 Лекция</button>
            <button class="btn primary" data-test="${t.id}">📝 Тест</button>
          </div>
        </div>`;
    });
    html += '</div>';
  });

  // Блок пробников
  if (probniki.length > 0) {
    html += `<h2 class="week-title" style="margin-top: 40px; color: #8b5cf6;">🎯 Пробники</h2><div class="cards">`;
    probniki.forEach(p => {
      const status = getStatus(p.id);
      html += `
        <div class="card review-card ${status.cls}" style="border-left-color: #8b5cf6; background: #faf5ff;">
          <h3>${p.title}</h3>
          <p class="status">${status.label}</p>
          <div class="btn-row">
            <button class="btn secondary" data-lecture="${p.id}">📖 Инструкция</button>
            <button class="btn primary" data-test="${p.id}">🎯 Пройти пробник</button>
          </div>
        </div>`;
    });
    html += '</div>';
  }

  content.innerHTML = html;

  // Навешиваем события
  content.querySelectorAll('[data-lecture]').forEach(b =>
    b.addEventListener('click', () => openLecture(b.dataset.lecture)));
  content.querySelectorAll('[data-test]').forEach(b =>
    b.addEventListener('click', () => openTest(b.dataset.test)));
  content.querySelectorAll('[data-global-review]').forEach(b =>
    b.addEventListener('click', () => openGlobalReview(b.dataset.globalReview)));
}

let currentLectureId = null;
function openLecture(id) {
  const topic = TOPICS.find(t => t.id === id);
  if (!topic) return;
  currentLectureId = id;
  document.getElementById('lectureTitle').textContent = topic.title;
  document.getElementById('lectureBody').textContent = topic.lecture || 'Информация пока не добавлена.';
  document.getElementById('lectureModal').classList.remove('hidden');

  if (!progress[id]) progress[id] = {};
  progress[id].lectureViewed = true;
  saveProgress();
}

document.getElementById('closeLecture').addEventListener('click', () => {
  document.getElementById('lectureModal').classList.add('hidden');
  refreshCurrentTab();
});

document.getElementById('goToTest').addEventListener('click', () => {
  const id = currentLectureId;
  document.getElementById('lectureModal').classList.add('hidden');
  if (id) openTest(id);
});

let currentTestId = null;
let currentTestData = null;

function openTest(id) {
  const topic = TOPICS.find(t => t.id === id);
  if (!topic) return;
  currentTestId = id;
  currentTestData = topic.test;
  document.getElementById('testTitle').textContent = topic.isProbnik ? topic.title : 'Тест: ' + topic.title;
  renderTestQuestions(currentTestData);
  document.getElementById('testModal').classList.remove('hidden');
}

function renderTestQuestions(questions) {
  const body = document.getElementById('testBody');
  body.innerHTML = questions.map((q, qi) => `
    <div class="question" data-q="${qi}">
      <p>${qi + 1}. ${q.question}</p>
      ${q.options.map((opt, oi) => `
        <label class="option">
          <input type="radio" name="q${qi}" value="${oi}">
          <span>${opt}</span>
        </label>`).join('')}
    </div>`).join('');
  document.getElementById('testResult').classList.add('hidden');
  document.getElementById('testResult').textContent = '';
  document.getElementById('submitTest').style.display = 'inline-block';
}

// ============================================================
// ОБЩЕЕ ПОВТОРЕНИЕ ПРОЙДЕННОГО
// ============================================================
function openGlobalReview(subject) {
  const passedTopics = TOPICS.filter(t => t.subject === subject && !t.isProbnik && progress[t.id] && (progress[t.id].lectureViewed || progress[t.id].testCompleted));
  
  if (passedTopics.length === 0) {
    alert('Ты ещё не прошла ни одной темы. Сначала открой лекцию или пройди тест.');
    return;
  }

  const allQuestions = [];
  passedTopics.forEach(t => {
    t.test.forEach(q => allQuestions.push(q));
  });

  const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 15);
  
  currentTestId = 'global_review_' + subject + '_' + Date.now();
  currentTestData = shuffled;
  document.getElementById('testTitle').textContent = '🔄 Повторение пройденного: ' + (subject === 'russian' ? 'Русский' : 'Общество');
  renderTestQuestions(shuffled);
  document.getElementById('testModal').classList.remove('hidden');
}

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('testModal').classList.add('hidden');
  refreshCurrentTab();
});

document.getElementById('submitTest').addEventListener('click', () => {
  if (!currentTestData) return;
  let score = 0;
  currentTestData.forEach((q, qi) => {
    const selected = document.querySelector(`input[name="q${qi}"]:checked`);
    const qDiv = document.querySelector(`.question[data-q="${qi}"]`);
    qDiv.querySelectorAll('.option').forEach(o => o.classList.remove('correct', 'wrong'));
    if (selected) {
      const val = parseInt(selected.value);
      const opts = qDiv.querySelectorAll('.option');
      if (val === q.correct) {
        score++;
        opts[val].classList.add('correct');
      } else {
        opts[val].classList.add('wrong');
        opts[q.correct].classList.add('correct');
      }
    } else {
      qDiv.querySelectorAll('.option')[q.correct].classList.add('correct');
    }
  });

  const result = document.getElementById('testResult');
  // Для пробников и повторений сделаем порог чуть ниже (например, 50%), чтобы не расстраиваться
  const isBigTest = currentTestId.startsWith('probnik') || currentTestId.startsWith('global');
  const passThreshold = isBigTest ? Math.ceil(currentTestData.length / 2) : Math.ceil(currentTestData.length * 0.7);
  
  const passed = score >= passThreshold;
  result.textContent = `Результат: ${score} из ${currentTestData.length} — ${passed ? '✅ зачёт' : '❌ нужно повторить'}`;
  result.className = 'test-result ' + (passed ? 'pass' : 'fail');

  progress[currentTestId] = {
    ...(progress[currentTestId] || {}),
    testCompleted: true,
    score,
    total: currentTestData.length
  };
  saveProgress();
  document.getElementById('submitTest').style.display = 'none';
});

function renderCalendar() {
  const content = document.getElementById('content');
  const totalWeeks = 24;
  const byWeek = {};
  TOPICS.forEach(t => {
    if (!t.isProbnik) {
      if (!byWeek[t.week]) byWeek[t.week] = [];
      byWeek[t.week].push(t);
    }
  });

  let html = '<h2 class="week-title">Календарь на 24 недели</h2><div class="calendar-grid">';
  for (let w = 1; w <= totalWeeks; w++) {
    const topics = byWeek[w] || [];
    let cls = '';
    let info = 'нет тем';
    if (topics.length > 0) {
      const allTests = topics.every(t => progress[t.id] && progress[t.id].testCompleted);
      const anyLecture = topics.some(t => progress[t.id] && progress[t.id].lectureViewed);
      
      if (allTests) {
        const allPassed = topics.every(t => progress[t.id].score >= 7);
        cls = allPassed ? 'green' : 'red';
        info = topics.map(t => `${t.title}: ${progress[t.id].score}/${progress[t.id].total}`).join('<br>');
      } else if (anyLecture) {
        cls = 'yellow';
        info = topics.map(t => t.title).join('<br>');
      } else {
        info = topics.map(t => t.title).join('<br>');
      }
    }
    html += `<div class="cal-cell ${cls}" data-week="${w}">
      <div class="week-num">Неделя ${w}</div>
      <div class="week-info">${info}</div>
    </div>`;
  }
  html += '</div>';
  html += `
    <div class="legend">
      <span class="g">все тесты пройдены (≥7)</span>
      <span class="y">лекция просмотрена</span>
      <span class="r">есть результат <7</span>
      <span class="n">не начата</span>
    </div>`;
  content.innerHTML = html;
}

let currentTab = 'russian';
function refreshCurrentTab() {
  if (currentTab === 'calendar') renderCalendar();
  else renderSubject(currentTab);
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.subject;
    refreshCurrentTab();
  });
});
