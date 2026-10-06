(() => {
  'use strict';

  const MAX_NUMBER = 45;
  const PICK_COUNT = 6;
  const MAX_FIXED = 5;
  const MAX_EXCLUDED = MAX_NUMBER - PICK_COUNT; // 39
  const SET_COUNT = 5;
  const SET_LABELS = ['A', 'B', 'C', 'D', 'E'];
  const COPY_FEEDBACK_MS = 1500;
  const BALL_DELAY_MS = 40;

  const state = {
    fixed: new Set(),
    excluded: new Set(),
    results: [],
  };

  const el = {};

  // ===== 초기화 =====
  function init() {
    el.fixedBoard = document.getElementById('fixedBoard');
    el.excludedBoard = document.getElementById('excludedBoard');
    el.fixedCount = document.getElementById('fixedCount');
    el.excludedCount = document.getElementById('excludedCount');
    el.errorMsg = document.getElementById('errorMsg');
    el.results = document.getElementById('results');
    el.copyAllBtn = document.getElementById('copyAllBtn');

    buildBoard(el.fixedBoard, '고정');
    buildBoard(el.excludedBoard, '제외');

    el.fixedBoard.addEventListener('click', (e) => {
      const btn = e.target.closest('.num-btn');
      if (btn) toggleFixed(Number(btn.dataset.number));
    });
    el.excludedBoard.addEventListener('click', (e) => {
      const btn = e.target.closest('.num-btn');
      if (btn) toggleExcluded(Number(btn.dataset.number));
    });
    el.results.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;
      const set = state.results[Number(btn.dataset.setIndex)];
      if (set) copyText(set.join(', '), btn);
    });

    document.getElementById('generateBtn').addEventListener('click', generateAll);
    document.getElementById('resetFixedBtn').addEventListener('click', resetFixed);
    document.getElementById('resetExcludedBtn').addEventListener('click', resetExcluded);
    document.getElementById('resetResultsBtn').addEventListener('click', resetResults);
    document.getElementById('resetAllBtn').addEventListener('click', resetAll);
    el.copyAllBtn.addEventListener('click', copyAll);

    renderBoards();
    renderResults();
  }

  function buildBoard(container, typeLabel) {
    const fragment = document.createDocumentFragment();
    for (let n = 1; n <= MAX_NUMBER; n++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'num-btn';
      btn.dataset.number = n;
      btn.textContent = n;
      btn.setAttribute('aria-label', `${typeLabel} ${n}번`);
      btn.setAttribute('aria-pressed', 'false');
      fragment.appendChild(btn);
    }
    container.appendChild(fragment);
  }

  // ===== 번호 선택 =====
  function toggleFixed(n) {
    if (state.excluded.has(n)) return;
    if (state.fixed.has(n)) {
      state.fixed.delete(n);
    } else if (state.fixed.size < MAX_FIXED) {
      state.fixed.add(n);
    } else {
      return;
    }
    clearError();
    renderBoards();
  }

  function toggleExcluded(n) {
    if (state.fixed.has(n)) return;
    if (state.excluded.has(n)) {
      state.excluded.delete(n);
    } else if (state.excluded.size < MAX_EXCLUDED) {
      state.excluded.add(n);
    } else {
      return;
    }
    clearError();
    renderBoards();
  }

  function renderBoards() {
    updateBoard(el.fixedBoard, state.fixed, state.excluded, 'is-fixed');
    updateBoard(el.excludedBoard, state.excluded, state.fixed, 'is-excluded');
    el.fixedCount.textContent = `${state.fixed.size} / ${MAX_FIXED}`;
    el.excludedCount.textContent = `${state.excluded.size} / ${MAX_EXCLUDED}`;
  }

  function updateBoard(board, selected, other, selectedClass) {
    board.querySelectorAll('.num-btn').forEach((btn) => {
      const n = Number(btn.dataset.number);
      const isSelected = selected.has(n);
      btn.classList.toggle(selectedClass, isSelected);
      btn.disabled = other.has(n);
      btn.setAttribute('aria-pressed', String(isSelected));
    });
  }

  // ===== 번호 생성 =====
  function getPool() {
    const pool = [];
    for (let n = 1; n <= MAX_NUMBER; n++) {
      if (!state.fixed.has(n) && !state.excluded.has(n)) pool.push(n);
    }
    return pool;
  }

  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function generateSet(pool) {
    const candidates = pool.slice();
    const set = [...state.fixed];
    while (set.length < PICK_COUNT) {
      set.push(candidates.splice(randomInt(candidates.length), 1)[0]);
    }
    return set.sort((a, b) => a - b);
  }

  // nCk — SET_COUNT 이상인지만 알면 되므로 그 이상이면 바로 반환
  function countCombinations(n, k) {
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result = (result * (n - k + i)) / i;
      if (result >= SET_COUNT) return result;
    }
    return result;
  }

  function generateAll() {
    const pool = getPool();
    const need = PICK_COUNT - state.fixed.size;
    if (pool.length < need) {
      showError('남은 번호가 부족해요. 제외 번호를 줄여주세요.');
      return;
    }
    clearError();

    const allowDuplicate = countCombinations(pool.length, need) < SET_COUNT;
    const seen = new Set();
    const results = [];
    while (results.length < SET_COUNT) {
      const set = generateSet(pool);
      const key = set.join(',');
      if (!allowDuplicate && seen.has(key)) continue;
      seen.add(key);
      results.push(set);
    }

    state.results = results;
    renderResults();
  }

  // ===== 결과 표시 =====
  function getBallColorClass(n) {
    if (n <= 10) return 'ball-1';
    if (n <= 20) return 'ball-2';
    if (n <= 30) return 'ball-3';
    if (n <= 40) return 'ball-4';
    return 'ball-5';
  }

  function renderResults() {
    el.results.replaceChildren();

    if (state.results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'result-empty';
      empty.textContent = '생성 버튼을 누르면 5세트가 여기에 나와요';
      el.results.appendChild(empty);
      return;
    }

    state.results.forEach((set, index) => {
      const row = document.createElement('div');
      row.className = 'result-row';

      const label = document.createElement('span');
      label.className = 'set-label';
      label.textContent = SET_LABELS[index];
      row.appendChild(label);

      set.forEach((n, i) => {
        const ball = document.createElement('span');
        ball.className = `ball ${getBallColorClass(n)}`;
        if (state.fixed.has(n)) ball.classList.add('is-fixed-ball');
        ball.style.animationDelay = `${(index * PICK_COUNT + i) * BALL_DELAY_MS}ms`;
        ball.textContent = n;
        row.appendChild(ball);
      });

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-sm btn-outline-secondary copy-btn';
      copyBtn.dataset.setIndex = index;
      copyBtn.setAttribute('aria-label', `${SET_LABELS[index]} 세트 복사`);
      setCopyButtonContent(copyBtn, 'idle');
      row.appendChild(copyBtn);

      el.results.appendChild(row);
    });
  }

  const COPY_BUTTON_CONTENT = {
    idle: { icon: 'bi-copy', text: '복사' },
    copied: { icon: 'bi-check2', text: '복사됨' },
    failed: { icon: 'bi-x-lg', text: '실패' },
  };

  function setCopyButtonContent(btn, status) {
    const { icon, text } = COPY_BUTTON_CONTENT[status];
    btn.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i> <span class="copy-text">${text}</span>`;
  }

  // ===== 복사 =====
  function copyAll() {
    if (state.results.length === 0) return;
    const text = state.results
      .map((set, i) => `${SET_LABELS[i]}: ${set.join(', ')}`)
      .join('\n');
    copyText(text, el.copyAllBtn);
  }

  async function copyText(text, btn) {
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {
        ok = false;
      }
    }
    if (!ok) ok = fallbackCopy(text);
    showCopyFeedback(btn, ok);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    textarea.remove();
    return ok;
  }

  function showCopyFeedback(btn, ok) {
    const isAllBtn = btn === el.copyAllBtn;
    const stateClass = ok ? 'is-copied' : 'is-copy-failed';

    btn.classList.remove('is-copied', 'is-copy-failed');
    btn.classList.add(stateClass);
    if (isAllBtn) {
      btn.querySelector('i').className = ok ? 'bi bi-check2' : 'bi bi-x-lg';
      btn.querySelector('span').textContent = ok ? '복사됨' : '복사 실패';
    } else {
      setCopyButtonContent(btn, ok ? 'copied' : 'failed');
    }

    clearTimeout(btn._copyTimer);
    btn._copyTimer = setTimeout(() => {
      btn.classList.remove(stateClass);
      if (isAllBtn) {
        btn.querySelector('i').className = 'bi bi-copy';
        btn.querySelector('span').textContent = '전체 복사';
      } else {
        setCopyButtonContent(btn, 'idle');
      }
    }, COPY_FEEDBACK_MS);
  }

  // ===== 초기화 =====
  function resetFixed() {
    state.fixed.clear();
    clearError();
    renderBoards();
  }

  function resetExcluded() {
    state.excluded.clear();
    clearError();
    renderBoards();
  }

  function resetResults() {
    state.results = [];
    renderResults();
  }

  function resetAll() {
    state.fixed.clear();
    state.excluded.clear();
    state.results = [];
    clearError();
    renderBoards();
    renderResults();
  }

  // ===== 에러 메시지 =====
  function showError(message) {
    el.errorMsg.textContent = message;
  }

  function clearError() {
    el.errorMsg.textContent = '';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
