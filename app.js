/* ============================================================
   质量点检清单 — 交互逻辑
   本文件不依赖任何框架，浏览器直接运行。
   数据保存在浏览器 localStorage 中，关闭页面不会丢失。
   ============================================================ */

/* ---------- 1. 点检项目定义 ----------
   要增减项目，只需修改这个数组。
   每项必须有三样：id（唯一标识）、name（项目名）、standard（判定标准） */
const CHECK_ITEMS = [
  { id: 'c1', name: '外观',       standard: '表面无划伤、碰伤、毛刺、油污' },
  { id: 'c2', name: '关键尺寸',   standard: '符合图纸标注公差范围' },
  { id: 'c3', name: '装配质量',   standard: '间隙均匀，转动顺畅无异响' },
  { id: 'c4', name: '标识标签',   standard: '标签内容与实物一致，字迹清晰不褪色' },
  { id: 'c5', name: '包装状态',   standard: '包装完好，无破损、受潮、挤压' },
  { id: 'c6', name: '功能测试',   standard: '按作业标准试运行，功能正常' }
];

/* 判定结果的三种取值 */
const RESULT_LABELS = {
  pass: '合格',
  fail: '不合格',
  na:   '免检'
};

/* 存储键名。加版本号后缀，将来改结构时不会串数据 */
const STORAGE_KEY = 'quality-check-v1';

/* ---------- 2. 当前状态 ---------- */
/* 这就是页面上所有数据的内存副本。
   页面任何变化都先改这里，再调用 save() 落盘，再 renderSummary() 重绘。 */
let state = {
  date: '',
  batch: '',
  inspector: '',
  results: {},   // { c1: 'pass', c2: 'fail', ... }
  notes: {}      // { c1: '左侧有细微划痕', ... }
};

/* ---------- 3. 页面元素引用 ---------- */
const elDate      = document.getElementById('inpDate');
const elBatch     = document.getElementById('inpBatch');
const elInspector = document.getElementById('inpInspector');
const elTbody     = document.getElementById('tbody');
const elSaveState = document.getElementById('saveState');

/* ---------- 4. 渲染：点检表格 ---------- */
function renderRows() {
  elTbody.innerHTML = '';

  CHECK_ITEMS.forEach(function (item, index) {
    const tr = document.createElement('tr');

    /* 序号 */
    const tdNo = document.createElement('td');
    tdNo.className = 'cell-no';
    tdNo.textContent = String(index + 1).padStart(2, '0');
    tr.appendChild(tdNo);

    /* 项目名 */
    const tdName = document.createElement('td');
    tdName.className = 'cell-name';
    tdName.textContent = item.name;
    tr.appendChild(tdName);

    /* 判定标准 */
    const tdStd = document.createElement('td');
    tdStd.className = 'cell-std';
    tdStd.textContent = item.standard;
    tr.appendChild(tdStd);

    /* 结果按钮组 */
    const tdRes = document.createElement('td');
    const group = document.createElement('div');
    group.className = 'res-group';

    Object.keys(RESULT_LABELS).forEach(function (key) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'res-btn';
      btn.textContent = RESULT_LABELS[key];
      btn.dataset.itemId = item.id;
      btn.dataset.result = key;

      /* 如果这一项已经有判定，把对应按钮点亮 */
      if (state.results[item.id] === key) {
        btn.classList.add('is-' + key);
      }

      btn.addEventListener('click', function () {
        setResult(item.id, key);
      });

      group.appendChild(btn);
    });

    tdRes.appendChild(group);
    tr.appendChild(tdRes);

    /* 备注 */
    const tdNote = document.createElement('td');
    tdNote.className = 'cell-note';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-input';
    input.placeholder = '选填';
    input.value = state.notes[item.id] || '';
    input.addEventListener('input', function () {
      state.notes[item.id] = input.value;
      save();
    });
    tdNote.appendChild(input);
    tr.appendChild(tdNote);

    elTbody.appendChild(tr);
  });
}

/* ---------- 5. 渲染：汇总统计 ---------- */
function renderSummary() {
  const total = CHECK_ITEMS.length;
  let pass = 0;
  let fail = 0;
  let na = 0;

  CHECK_ITEMS.forEach(function (item) {
    const r = state.results[item.id];
    if (r === 'pass') pass++;
    else if (r === 'fail') fail++;
    else if (r === 'na') na++;
  });

  /* 免检不计入合格率分母 */
  const judged = pass + fail;
  const rate = judged === 0 ? null : Math.round((pass / judged) * 100);

  document.getElementById('stTotal').textContent = total;
  document.getElementById('stDone').textContent  = pass + fail + na;
  document.getElementById('stPass').textContent  = pass;
  document.getElementById('stFail').textContent  = fail;
  document.getElementById('stNa').textContent    = na;
  document.getElementById('stRate').textContent  = rate === null ? '--' : rate + '%';
}

/* ---------- 6. 写入判定结果 ---------- */
function setResult(itemId, result) {
  /* 再次点击同一个结果 = 取消该判定 */
  if (state.results[itemId] === result) {
    delete state.results[itemId];
  } else {
    state.results[itemId] = result;
  }
  save();
  renderRows();
  renderSummary();
}

/* ---------- 7. 本地存储 ---------- */
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    flashSaved();
  } catch (err) {
    console.error('保存失败：', err);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    state = Object.assign(state, parsed);
    return true;
  } catch (err) {
    console.error('读取失败：', err);
    return false;
  }
}

let saveTimer = null;
function flashSaved() {
  elSaveState.textContent = '已自动保存';
  elSaveState.classList.remove('is-idle');

  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    elSaveState.textContent = '已就绪';
    elSaveState.classList.add('is-idle');
  }, 1600);
}

/* ---------- 8. 清空 ---------- */
function clearAll() {
  const confirmed = window.confirm('确认清空本次所有判定和备注？此操作不可撤销。');
  if (!confirmed) return;

  state.results = {};
  state.notes = {};
  save();
  renderRows();
  renderSummary();
}

/* ---------- 9. 初始化 ---------- */
function init() {
  load();

  /* 日期没填过就默认今天 */
  if (!state.date) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    state.date = yyyy + '-' + mm + '-' + dd;
  }

  elDate.value = state.date;
  elBatch.value = state.batch;
  elInspector.value = state.inspector;

  elDate.addEventListener('change', function () {
    state.date = elDate.value;
    save();
  });

  elBatch.addEventListener('input', function () {
    state.batch = elBatch.value;
    save();
  });

  elInspector.addEventListener('input', function () {
    state.inspector = elInspector.value;
    save();
  });

  document.getElementById('btnClear').addEventListener('click', clearAll);

  renderRows();
  renderSummary();

  elSaveState.classList.add('is-idle');
}

init();
