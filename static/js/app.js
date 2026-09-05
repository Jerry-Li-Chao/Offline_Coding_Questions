/* Offline Coding Questions — client application. */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const el = function (tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  const state = {
    problem: null,
    editor: null,
    cases: [],
    activeCase: 0,
    lastVerdict: null,
    saveTimer: null,
    notesTimer: null,
    caseTimer: null
  };

  /* ------------------------------------------------------------------- api */

  function api(path, options) {
    return fetch(path, Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, options)).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
        return data;
      });
    });
  }

  function post(path, body) {
    return api(path, { method: 'POST', body: JSON.stringify(body) });
  }

  /* ----------------------------------------------------------------- toast */

  let toastTimer = null;
  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.add('hidden'); }, 2200);
  }

  /* ----------------------------------------------------------------- theme */

  function initTheme() {
    const saved = localStorage.getItem('ocq-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    $('themeBtn').textContent = saved === 'dark' ? '☼' : '☽';
    $('themeBtn').onclick = function () {
      const next = document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ocq-theme', next);
      $('themeBtn').textContent = next === 'dark' ? '☼' : '☽';
    };
  }

  /* ---------------------------------------------------------------- router */

  function go(path, replace) {
    if (replace) history.replaceState({}, '', path);
    else history.pushState({}, '', path);
    route();
  }

  function route() {
    const match = location.pathname.match(/^\/problems\/([A-Za-z0-9._-]+)/);
    if (match) return showProblem(match[1]);
    if (location.pathname === '/backups') return showBackups();
    showList();
  }

  function showOnly(id) {
    ['listView', 'problemView', 'backupsView'].forEach(function (view) {
      $(view).classList.toggle('hidden', view !== id);
    });
  }

  window.addEventListener('popstate', route);

  /* ------------------------------------------------------------- list view */

  let allProblems = [];

  function showList() {
    showOnly('listView');
    $('topbarCenter').innerHTML = '';
    document.title = 'Offline Coding Questions';

    api('/api/problems').then(function (data) {
      allProblems = data.problems;
      const solved = allProblems.filter(function (p) { return p.status === 'solved'; }).length;
      $('listStats').textContent =
        solved + ' of ' + allProblems.length + ' solved · ' +
        data.stats.submissions + ' submission' + (data.stats.submissions === 1 ? '' : 's') +
        ' recorded locally';
      renderList('');
    }).catch(function (err) { toast(err.message); });

    $('listSearch').oninput = function () { renderList(this.value); };
  }

  function renderList(query) {
    const body = $('problemRows');
    body.innerHTML = '';
    const needle = query.trim().toLowerCase();

    let currentSection = null;

    allProblems.filter(function (p) {
      return !needle ||
        p.title.toLowerCase().indexOf(needle) !== -1 ||
        p.topics.join(' ').toLowerCase().indexOf(needle) !== -1 ||
        (p.section || '').toLowerCase().indexOf(needle) !== -1;
    }).forEach(function (p) {
      // one header row per section, in the order the sections first appear
      if (p.section && p.section !== currentSection) {
        currentSection = p.section;
        const head = el('tr', 'section-row');
        const cell = el('td');
        cell.colSpan = 5;
        cell.appendChild(el('span', 'section-name', p.section));
        const solved = allProblems.filter(function (q) {
          return q.section === p.section && q.status === 'solved';
        }).length;
        const total = allProblems.filter(function (q) {
          return q.section === p.section;
        }).length;
        cell.appendChild(el('span', 'section-count', solved + ' / ' + total));
        head.appendChild(cell);
        body.appendChild(head);
      }

      const tr = el('tr');
      tr.onclick = function () { go('/problems/' + p.slug); };

      const status = el('td', 'col-status');
      status.appendChild(el('span', 'status-dot ' + p.status));
      status.title = p.status;
      tr.appendChild(status);

      const starCell = el('td', 'col-star');
      const star = el('button', 'star-btn' + (p.starred ? ' on' : ''), p.starred ? '★' : '☆');
      star.onclick = function (e) {
        e.stopPropagation();
        p.starred = !p.starred;
        star.textContent = p.starred ? '★' : '☆';
        star.classList.toggle('on', p.starred);
        post('/api/problems/' + p.slug + '/state', { starred: p.starred });
      };
      starCell.appendChild(star);
      tr.appendChild(starCell);

      const title = el('td');
      title.appendChild(el('span', 'p-title', p.title));
      tr.appendChild(title);

      const topics = el('td', 'col-topic');
      (p.topics || []).slice(0, 1).forEach(function (t) {
        topics.appendChild(el('span', 'topic-chip', t));
      });
      tr.appendChild(topics);

      const diff = el('td', 'col-diff');
      diff.appendChild(el('span', 'diff ' + p.difficulty, p.difficulty));
      tr.appendChild(diff);

      body.appendChild(tr);
    });

    if (!body.children.length) {
      const tr = el('tr');
      const td = el('td', 'empty', 'No problems match that search.');
      td.colSpan = 5;
      tr.appendChild(td);
      body.appendChild(tr);
    }
  }

  /* ---------------------------------------------------------- problem view */

  function showProblem(slug) {
    showOnly('problemView');

    api('/api/problems/' + slug).then(function (problem) {
      state.problem = problem;
      document.title = problem.title + ' · Offline Coding Questions';
      renderTopbar(problem);
      renderDescription(problem);
      renderSolutionTab(problem);
      renderNotes(problem);
      loadSubmissions(slug);
      mountEditor(problem);
      buildCases(problem);
      resetResultPanel();
      activateTab($('leftTabs'), 'description');
      activateTab($('consoleTabs'), 'cases');
    }).catch(function (err) {
      toast(err.message);
      go('/', true);
    });
  }

  function renderTopbar(problem) {
    const host = $('topbarCenter');
    host.innerHTML = '';
    host.appendChild(el('span', 'crumb-title', problem.title));
    host.appendChild(el('span', 'diff ' + problem.difficulty, problem.difficulty));

    const badge = el('span', 'badge ' + problem.status, statusLabel(problem.status));
    badge.id = 'statusBadge';
    host.appendChild(badge);

    const star = el('button', 'icon-btn' + (problem.starred ? ' on' : ''),
      problem.starred ? '★' : '☆');
    star.title = 'Star this problem';
    star.onclick = function () {
      problem.starred = !problem.starred;
      star.textContent = problem.starred ? '★' : '☆';
      star.classList.toggle('on', problem.starred);
      post('/api/problems/' + problem.slug + '/state', { starred: problem.starred });
    };
    host.appendChild(star);
  }

  function statusLabel(status) {
    if (status === 'solved') return 'Solved';
    if (status === 'attempted') return 'Attempted';
    return 'Unsolved';
  }

  function renderDescription(problem) {
    const host = $('descriptionBody');
    host.innerHTML = '';

    const head = el('div', 'meta-row');
    head.appendChild(el('h1', 'meta-title', problem.title));
    host.appendChild(head);

    const sub = el('div', 'meta-sub');
    sub.appendChild(el('span', 'diff ' + problem.difficulty, problem.difficulty));
    (problem.topics || []).forEach(function (t) {
      sub.appendChild(el('span', 'topic-chip', t));
    });
    if (problem.source) sub.appendChild(el('span', 'badge', problem.source));
    host.appendChild(sub);

    const body = el('div');
    body.innerHTML = window.MD.render(problem.description);
    host.appendChild(body);
  }

  function renderSolutionTab(problem) {
    const guard = $('solutionGuard');
    const body = $('solutionBody');
    body.innerHTML = window.MD.render(problem.solutionMarkdown ||
      '_No editorial has been written for this problem yet._');

    const seen = sessionStorage.getItem('ocq-sol-' + problem.slug) === '1';
    guard.classList.toggle('hidden', seen);
    body.classList.toggle('hidden', !seen);

    $('revealSolution').onclick = function () {
      sessionStorage.setItem('ocq-sol-' + problem.slug, '1');
      guard.classList.add('hidden');
      body.classList.remove('hidden');
    };
  }

  /* ----------------------------------------------------------------- notes */

  // Only syntax the renderer actually supports belongs in here.
  const CHEATSHEET = [
    ['# Heading', 'Heading — ## and ### for smaller'],
    ['**bold**', 'Bold'],
    ['*italic*', 'Italic'],
    ['~~struck~~', 'Strikethrough'],
    ['`code`', 'Inline code'],
    ['```python\ncode\n```', 'Code block, syntax highlighted'],
    ['- item', 'Bullet list'],
    ['1. item', 'Numbered list'],
    ['- [ ] todo\n- [x] done', 'Checklist'],
    ['> quoted', 'Blockquote'],
    ['[label](url)', 'Link'],
    ['| a | b |\n| --- | --- |\n| 1 | 2 |', 'Table'],
    ['---', 'Horizontal rule'],
    ['<details>\n<summary>Tip title</summary>\n\nHidden until clicked.\n\n</details>',
     'Collapsible section — good for hints you want to re-test yourself on']
  ];

  function buildCheatsheet() {
    const host = $('cheatsheet');
    if (host.dataset.built) return;

    const note = el('p', 'cheat-note',
      'Everything below renders live in the preview underneath.');
    host.appendChild(note);

    const grid = el('div', 'cheat-grid');
    CHEATSHEET.forEach(function (row) {
      const code = el('code', null, row[0]);
      grid.appendChild(code);
      grid.appendChild(el('div', 'cheat-desc', row[1]));
    });
    host.appendChild(grid);
    host.dataset.built = '1';
  }

  function renderNotes(problem) {
    const input = $('notesInput');
    const preview = $('notesPreview');

    function paint() {
      const text = input.value;
      preview.innerHTML = text.trim()
        ? window.MD.render(text)
        : '<p class="empty-preview">Preview appears here as you type.</p>';
    }

    input.value = problem.state.notes || '';
    $('notesDot').classList.toggle('show', !!input.value.trim());
    $('notesSaved').textContent = input.value ? 'Saved' : '';
    paint();

    input.oninput = function () {
      paint();                                  // live, on every keystroke
      $('notesSaved').textContent = 'Saving…';
      clearTimeout(state.notesTimer);
      state.notesTimer = setTimeout(function () {
        post('/api/problems/' + problem.slug + '/state', { notes: input.value })
          .then(function () {
            $('notesSaved').textContent = 'Saved';
            $('notesDot').classList.toggle('show', !!input.value.trim());
          })
          .catch(function (err) { $('notesSaved').textContent = err.message; });
      }, 500);
    };
  }

  function initNotesPane() {
    const toggle = $('cheatToggle');
    const sheet = $('cheatsheet');

    toggle.onclick = function () {
      const open = sheet.classList.contains('hidden');
      if (open) buildCheatsheet();
      sheet.classList.toggle('hidden', !open);
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = (open ? '&#9662;' : '&#9656;') + ' Markdown cheatsheet';
      localStorage.setItem('ocq-cheatsheet', open ? '1' : '0');
    };
    if (localStorage.getItem('ocq-cheatsheet') === '1') toggle.onclick();

    const input = $('notesInput');
    const savedHeight = localStorage.getItem('ocq-notes-split');
    if (savedHeight) input.style.flexBasis = savedHeight;

    drag($('notesGutter'), function (e) {
      const rect = $('notesSplit').getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(85, Math.max(15, pct));
      input.style.flexBasis = clamped.toFixed(2) + '%';
      localStorage.setItem('ocq-notes-split', clamped.toFixed(2) + '%');
    }, 'resizing-v');
  }

  /* -------------------------------------------------------------- editor */

  function mountEditor(problem) {
    const initial = problem.state.code || problem.starter || '';
    state.editor = new window.CodeEditor($('editorHost'), {
      value: initial,
      onChange: scheduleCodeSave,
      onRun: runTests,
      onSubmit: submitSolution
    });

    $('resetBtn').onclick = function () {
      if (!confirm('Reset the editor to the starter code? Your current draft is lost.')) return;
      state.editor.setValue(problem.starter || '');
      scheduleCodeSave();
      toast('Reset to starter code');
    };

    $('runBtn').onclick = runTests;
    $('submitBtn').onclick = submitSolution;
    $('runHint').textContent = navigator.platform.indexOf('Mac') === 0
      ? '⌘↩ run · ⇧⌘↩ submit'
      : 'Ctrl+↩ run · Ctrl+Shift+↩ submit';
  }

  function scheduleCodeSave() {
    $('codeSaved').textContent = 'Saving…';
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () {
      post('/api/problems/' + state.problem.slug + '/state', {
        code: state.editor.getValue()
      }).then(function () {
        $('codeSaved').textContent = 'Saved';
        setTimeout(function () {
          if ($('codeSaved').textContent === 'Saved') $('codeSaved').textContent = '';
        }, 1500);
      }).catch(function (err) { $('codeSaved').textContent = err.message; });
    }, 600);
  }

  /* ---------------------------------------------------------- test cases */

  function buildCases(problem) {
    const saved = problem.state.testcases;
    const source = (saved && saved.length) ? saved : problem.sampleTests;
    state.cases = source.map(function (t) {
      const inputs = {};
      problem.params.forEach(function (p) {
        inputs[p.name] = JSON.stringify(
          t.input && Object.prototype.hasOwnProperty.call(t.input, p.name)
            ? t.input[p.name] : null);
      });
      return {
        inputs: inputs,
        expected: t.output === undefined ? '' : JSON.stringify(t.output)
      };
    });
    if (!state.cases.length) addCase(false);
    state.activeCase = 0;
    renderCases();
  }

  function addCase(rerender) {
    const problem = state.problem;
    const template = state.cases[state.activeCase];
    const inputs = {};
    problem.params.forEach(function (p) {
      inputs[p.name] = template ? template.inputs[p.name] : 'null';
    });
    state.cases.push({ inputs: inputs, expected: template ? template.expected : '' });
    state.activeCase = state.cases.length - 1;
    if (rerender !== false) { renderCases(); saveCases(); }
  }

  function saveCases() {
    const payload = state.cases.map(function (c) {
      const input = {};
      Object.keys(c.inputs).forEach(function (k) {
        try { input[k] = JSON.parse(c.inputs[k]); } catch (e) { input[k] = null; }
      });
      let output;
      try { output = c.expected === '' ? undefined : JSON.parse(c.expected); }
      catch (e) { output = null; }
      return output === undefined ? { input: input } : { input: input, output: output };
    });
    post('/api/problems/' + state.problem.slug + '/state', { testcases: payload })
      .catch(function () { /* draft cases are a convenience; ignore save races */ });
  }

  function renderCases() {
    const host = $('casesBody');
    host.innerHTML = '';

    const tabs = el('div', 'case-tabs');
    state.cases.forEach(function (c, i) {
      const chip = el('button', 'case-chip' + (i === state.activeCase ? ' active' : ''));
      chip.appendChild(el('span', null, 'Case ' + (i + 1)));
      if (c.mark) chip.appendChild(el('span', 'mark', c.mark));
      if (state.cases.length > 1) {
        const kill = el('span', 'kill', '×');
        kill.title = 'Remove this case';
        kill.onclick = function (e) {
          e.stopPropagation();
          state.cases.splice(i, 1);
          state.activeCase = Math.min(state.activeCase, state.cases.length - 1);
          renderCases();
          saveCases();
        };
        chip.appendChild(kill);
      }
      chip.onclick = function () { state.activeCase = i; renderCases(); };
      tabs.appendChild(chip);
    });

    const add = el('button', 'case-chip case-add', '+');
    add.title = 'Add a test case';
    add.onclick = function () { addCase(); };
    tabs.appendChild(add);
    host.appendChild(tabs);

    const active = state.cases[state.activeCase];
    if (!active) return;

    state.problem.params.forEach(function (p) {
      host.appendChild(field(p.name, p.type, active.inputs[p.name], function (value) {
        active.inputs[p.name] = value;
      }));
    });

    host.appendChild(field('expected', state.problem.returns.type || 'any',
      active.expected, function (value) { active.expected = value; },
      'leave blank to just see the output'));
  }

  function field(name, type, value, onInput, hint) {
    const wrap = el('div', 'field');
    const label = el('label');
    label.appendChild(document.createTextNode(name + ' = '));
    label.appendChild(el('span', 'ty', hint ? '// ' + hint : type));
    wrap.appendChild(label);

    const area = el('textarea');
    area.value = value == null ? '' : value;
    area.rows = Math.min(6, String(area.value).split('\n').length);
    const err = el('div', 'field-err');
    err.style.display = 'none';

    area.oninput = function () {
      onInput(area.value);
      const bad = area.value.trim() !== '' && !isJSON(area.value);
      area.classList.toggle('bad', bad);
      err.style.display = bad ? 'block' : 'none';
      err.textContent = bad ? 'Not valid JSON' : '';
      clearTimeout(state.caseTimer);
      state.caseTimer = setTimeout(saveCases, 700);
    };
    wrap.appendChild(area);
    wrap.appendChild(err);
    return wrap;
  }

  function isJSON(text) {
    try { JSON.parse(text); return true; } catch (e) { return false; }
  }

  function collectCases() {
    const tests = [];
    for (let i = 0; i < state.cases.length; i++) {
      const c = state.cases[i];
      const input = {};
      const names = Object.keys(c.inputs);
      for (let j = 0; j < names.length; j++) {
        const raw = c.inputs[names[j]];
        if (String(raw).trim() === '') {
          throw new Error('Case ' + (i + 1) + ': "' + names[j] + '" is empty');
        }
        try { input[names[j]] = JSON.parse(raw); }
        catch (e) {
          throw new Error('Case ' + (i + 1) + ': "' + names[j] + '" is not valid JSON');
        }
      }
      const test = { input: input };
      if (String(c.expected).trim() === '') {
        test.check = false;
      } else {
        try { test.output = JSON.parse(c.expected); }
        catch (e) { throw new Error('Case ' + (i + 1) + ': expected value is not valid JSON'); }
      }
      tests.push(test);
    }
    return tests;
  }

  /* ------------------------------------------------------------ run/submit */

  function busy(on, which) {
    $('runBtn').disabled = on;
    $('submitBtn').disabled = on;
    if (on) {
      $(which === 'submit' ? 'submitBtn' : 'runBtn').textContent =
        which === 'submit' ? 'Judging…' : 'Running…';
    } else {
      $('runBtn').textContent = 'Run';
      $('submitBtn').textContent = 'Submit';
    }
  }

  function runTests() {
    let tests;
    try { tests = collectCases(); }
    catch (err) { return toast(err.message); }

    busy(true, 'run');
    setConsoleCollapsed(false);
    activateTab($('consoleTabs'), 'result');
    $('resultBody').innerHTML = '<p class="empty">Running…</p>';

    post('/api/run', {
      slug: state.problem.slug,
      code: state.editor.getValue(),
      tests: tests
    }).then(function (verdict) {
      renderVerdict(verdict);
      markCaseChips(verdict);
    }).catch(function (err) {
      $('resultBody').innerHTML = '<p class="empty">' + escapeHTML(err.message) + '</p>';
    }).then(function () { busy(false); });
  }

  function submitSolution() {
    busy(true, 'submit');
    setConsoleCollapsed(false);
    activateTab($('consoleTabs'), 'result');
    $('resultBody').innerHTML = '<p class="empty">Judging against all ' +
      state.problem.totalTests + ' tests…</p>';

    post('/api/submit', {
      slug: state.problem.slug,
      code: state.editor.getValue()
    }).then(function (verdict) {
      renderVerdict(verdict);
      if (verdict.problemStatus) {
        state.problem.status = verdict.problemStatus;
        const badge = $('statusBadge');
        if (badge) {
          badge.className = 'badge ' + verdict.problemStatus;
          badge.textContent = statusLabel(verdict.problemStatus);
        }
      }
      toast(verdict.label);
      loadSubmissions(state.problem.slug);
    }).catch(function (err) {
      $('resultBody').innerHTML = '<p class="empty">' + escapeHTML(err.message) + '</p>';
    }).then(function () { busy(false); });
  }

  function markCaseChips(verdict) {
    state.cases.forEach(function (c, i) {
      const row = (verdict.results || [])[i];
      if (!row) { c.mark = ''; return; }
      if (row.status === 'passed') c.mark = '✓';
      else if (row.status === 'ran') c.mark = '';
      else c.mark = '✗';
    });
    renderCases();
  }

  function resetResultPanel() {
    $('resultBody').innerHTML = '<p class="empty">Run your code to see results here.</p>';
    $('resultDot').className = 'dot';
  }

  /* --------------------------------------------------------------- results */

  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function pretty(value) {
    if (value === undefined) return '';
    const text = JSON.stringify(value);
    if (text === undefined) return String(value);
    return text.length > 220 ? text.slice(0, 220) + ' … (' + text.length + ' chars)' : text;
  }

  function ioBlock(label, value, cls) {
    const box = el('div', 'io');
    box.appendChild(el('div', 'io-label', label));
    const pre = el('pre', cls || null, value);
    box.appendChild(pre);
    return box;
  }

  function renderVerdict(verdict) {
    state.lastVerdict = verdict;
    const host = $('resultBody');
    host.innerHTML = '';

    const accepted = verdict.status === 'accepted';
    const dot = $('resultDot');
    dot.className = 'dot show ' + (accepted ? 'pass' : 'fail');

    const head = el('div', 'verdict-head');
    head.appendChild(el('div', 'verdict-title ' + (accepted ? 'accepted' : 'bad'),
      verdict.label || verdict.status));
    const bits = [];
    if (verdict.total) bits.push(verdict.passed + ' / ' + verdict.total + ' tests passed');
    if (verdict.runtime_ms != null) bits.push(verdict.runtime_ms.toFixed(1) + ' ms');
    if (verdict.mode === 'submit') bits.push('submitted');
    head.appendChild(el('div', 'verdict-meta', bits.join(' · ')));
    host.appendChild(head);

    if (verdict.total) {
      const bar = el('div', 'progress' + (accepted ? '' : ' bad'));
      const fill = el('i');
      fill.style.width = Math.round(100 * verdict.passed / verdict.total) + '%';
      bar.appendChild(fill);
      host.appendChild(bar);
    }

    if (verdict.error) {
      host.appendChild(ioBlock(
        verdict.status === 'compile_error' ? 'Syntax error' : 'Error',
        verdict.error, 'err'));
    }

    const results = verdict.results || [];
    // On a submit, focus on the first failure rather than dumping every test.
    const failures = results.filter(function (r) {
      return r.status !== 'passed' && r.status !== 'ran';
    });
    const shown = verdict.mode === 'submit'
      ? (failures.length ? failures.slice(0, 1) : results.slice(0, 0))
      : results;

    if (verdict.mode === 'submit' && failures.length) {
      host.appendChild(el('div', 'io-label', 'First failing test'));
    }

    shown.forEach(function (row) {
      host.appendChild(resultCard(row, verdict.mode));
    });

    if (verdict.mode === 'submit' && accepted) {
      const note = el('p', 'empty',
        'All ' + verdict.total + ' tests passed. Saved to your submission history.');
      host.appendChild(note);
    }
  }

  function resultCard(row, mode) {
    const card = el('div', 'res-card');
    const head = el('div', 'res-head');
    head.appendChild(el('div', 'res-name',
      mode === 'submit' ? 'Test ' + (row.index + 1) : 'Case ' + (row.index + 1)));
    const label = { passed: 'Passed', failed: 'Failed', error: 'Error',
                    timeout: 'Timed out', ran: 'Ran' }[row.status] || row.status;
    head.appendChild(el('div', 'res-status ' + row.status, label));
    if (row.runtime_ms) {
      head.appendChild(el('div', 'res-time', row.runtime_ms.toFixed(2) + ' ms'));
    }
    card.appendChild(head);

    if (row.input) {
      const lines = Object.keys(row.input).map(function (k) {
        return k + ' = ' + pretty(row.input[k]);
      }).join('\n');
      card.appendChild(ioBlock('Input', lines));
    }

    if (row.status !== 'error' && row.status !== 'timeout') {
      card.appendChild(ioBlock('Output', pretty(row.output),
        row.status === 'passed' ? 'ok' : (row.checked ? 'bad' : null)));
      if (row.checked) {
        card.appendChild(ioBlock(
          row.compare === 'any_of' ? 'Expected (any of these)' : 'Expected',
          pretty(row.expected)));
      }
    }

    if (row.error) card.appendChild(ioBlock('Error', row.error, 'err'));
    if (row.stdout) card.appendChild(ioBlock('Stdout', row.stdout.replace(/\n$/, '')));
    return card;
  }

  /* ---------------------------------------------------------- submissions */

  function loadSubmissions(slug) {
    api('/api/problems/' + slug + '/submissions').then(function (data) {
      renderSubmissions(data.submissions);
    }).catch(function (err) { toast(err.message); });
  }

  function renderSubmissions(items) {
    const host = $('submissionsBody');
    host.innerHTML = '';

    if (!items.length) {
      host.appendChild(el('p', 'empty',
        'No submissions yet. Hit Submit to run the full test suite — every ' +
        'attempt is recorded here on your machine.'));
      return;
    }

    const table = el('table', 'subs-table');
    table.innerHTML =
      '<thead><tr><th>Status</th><th>Tests</th><th>Runtime</th><th>When</th></tr></thead>';
    const body = el('tbody');

    items.forEach(function (s) {
      const tr = el('tr');
      const status = el('td');
      status.appendChild(el('span', 'verdict ' + s.status, s.label));
      tr.appendChild(status);
      tr.appendChild(el('td', null, s.passed + ' / ' + s.total));
      tr.appendChild(el('td', null, s.runtime_ms.toFixed(1) + ' ms'));
      tr.appendChild(el('td', null, timeAgo(s.created_at)));
      tr.onclick = function () { openSubmission(s.id); };
      body.appendChild(tr);
    });

    table.appendChild(body);
    host.appendChild(table);
  }

  function openSubmission(id) {
    api('/api/submissions/' + id).then(function (sub) {
      const host = $('submissionsBody');
      host.innerHTML = '';

      const bar = el('div', 'notes-bar');
      const back = el('button', 'btn btn-ghost', '← All submissions');
      back.onclick = function () { loadSubmissions(state.problem.slug); };
      bar.appendChild(back);

      const load = el('button', 'btn btn-ghost', 'Load into editor');
      load.onclick = function () {
        state.editor.setValue(sub.code);
        scheduleCodeSave();
        toast('Loaded submission #' + sub.id);
      };
      bar.appendChild(load);

      const del = el('button', 'btn btn-ghost', 'Delete');
      del.onclick = function () {
        if (!confirm('Delete this submission from your history?')) return;
        fetch('/api/submissions/' + sub.id, { method: 'DELETE' })
          .then(function () {
            loadSubmissions(state.problem.slug);
            toast('Submission deleted');
          });
      };
      bar.appendChild(del);
      host.appendChild(bar);

      const detail = el('div', 'sub-detail');
      const head = el('div', 'verdict-head');
      head.appendChild(el('div', 'verdict-title ' +
        (sub.status === 'accepted' ? 'accepted' : 'bad'), sub.label));
      head.appendChild(el('div', 'verdict-meta',
        sub.passed + ' / ' + sub.total + ' tests · ' +
        sub.runtime_ms.toFixed(1) + ' ms · ' + new Date(sub.created_at * 1000).toLocaleString()));
      detail.appendChild(head);

      if (sub.detail && sub.detail.error) {
        detail.appendChild(ioBlock('Error', sub.detail.error, 'err'));
      }

      const failed = (sub.detail.results || []).filter(function (r) {
        return r.status !== 'passed' && r.status !== 'ran';
      });
      if (failed.length) {
        detail.appendChild(el('div', 'io-label', 'First failing test'));
        detail.appendChild(resultCard(failed[0], 'submit'));
      }

      const pre = el('pre');
      pre.innerHTML = window.HL.python(sub.code);
      detail.appendChild(el('div', 'io-label', 'Submitted code'));
      detail.appendChild(pre);
      host.appendChild(detail);
    }).catch(function (err) { toast(err.message); });
  }

  function timeAgo(seconds) {
    const delta = Date.now() / 1000 - seconds;
    if (delta < 60) return 'just now';
    if (delta < 3600) return Math.floor(delta / 60) + 'm ago';
    if (delta < 86400) return Math.floor(delta / 3600) + 'h ago';
    if (delta < 604800) return Math.floor(delta / 86400) + 'd ago';
    return new Date(seconds * 1000).toLocaleDateString();
  }

  /* -------------------------------------------------------------- snapshots */

  function showBackups() {
    showOnly('backupsView');
    $('topbarCenter').innerHTML = '';
    document.title = 'Snapshots · Offline Coding Questions';
    loadBackups();
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function loadBackups() {
    api('/api/backups').then(function (data) {
      const now = data.current;
      $('backupIntro').textContent =
        'Your notes and submission history live in one file. Right now it holds ' +
        plural(now.notes, 'note') + ', ' + plural(now.drafts, 'code draft') +
        ' and ' + plural(now.submissions, 'submission') + '. ' +
        'A snapshot is saved automatically when the server starts and stops, ' +
        'every 30 minutes while anything changes, and before any restore.';
      $('backupPath').textContent = 'Snapshots are kept in ' + data.directory;
      renderBackups(data.backups);
    }).catch(function (err) { toast(err.message); });
  }

  function renderBackups(items) {
    const host = $('backupList');
    host.innerHTML = '';

    if (!items.length) {
      host.appendChild(el('p', 'empty', 'No snapshots yet.'));
      return;
    }

    items.forEach(function (snap) {
      const row = el('div', 'snap');

      const main = el('div', 'snap-main');
      const when = el('div', 'snap-when',
        new Date(snap.created_at * 1000).toLocaleString());
      when.appendChild(el('span', 'snap-kind ' + snap.kind, snap.kind));
      main.appendChild(when);
      main.appendChild(el('div', 'snap-counts',
        plural(snap.counts.notes, 'note') + ' · ' +
        plural(snap.counts.drafts, 'draft') + ' · ' +
        plural(snap.counts.submissions, 'submission') + ' · ' +
        snap.counts.solved + ' solved · ' + Math.round(snap.bytes / 1024) + ' KB'));
      if (snap.label) main.appendChild(el('div', 'snap-label', snap.label));
      row.appendChild(main);

      const buttons = el('div', 'snap-buttons');

      const restore = el('button', 'btn btn-ghost', 'Restore');
      restore.onclick = function () {
        const message =
          'Replace your current data with this snapshot?\n\n' +
          'Snapshot: ' + plural(snap.counts.notes, 'note') + ', ' +
          plural(snap.counts.submissions, 'submission') + '\n\n' +
          'Your current data is saved as a snapshot first, so this can be undone.';
        if (!confirm(message)) return;
        post('/api/backups/' + snap.name + '/restore', {}).then(function (res) {
          toast('Restored. Previous state saved as a safety snapshot.');
          loadBackups();
          if (res.safety_snapshot) {
            console.info('Undo this restore with snapshot:', res.safety_snapshot);
          }
        }).catch(function (err) { toast(err.message); });
      };
      buttons.appendChild(restore);

      const download = el('a', 'btn btn-ghost', 'Download');
      download.href = '/api/backups/' + snap.name + '/download';
      download.setAttribute('download', snap.name + '.db');
      buttons.appendChild(download);

      const remove = el('button', 'btn btn-ghost', 'Delete');
      remove.onclick = function () {
        if (!confirm('Delete this snapshot permanently?')) return;
        fetch('/api/backups/' + snap.name, { method: 'DELETE' })
          .then(function () { toast('Snapshot deleted'); loadBackups(); });
      };
      buttons.appendChild(remove);

      row.appendChild(buttons);
      host.appendChild(row);
    });
  }

  function initBackups() {
    $('backupsBtn').onclick = function () { go('/backups'); };

    $('createBackup').onclick = function () {
      const label = $('backupLabel').value.trim();
      post('/api/backups', { label: label }).then(function () {
        $('backupLabel').value = '';
        toast('Snapshot saved');
        loadBackups();
      }).catch(function (err) { toast(err.message); });
    };

    $('exportNotes').onclick = function () {
      post('/api/backups/export-notes', {}).then(function (res) {
        toast('Exported ' + plural(res.files.length, 'note') + ' to ' + res.directory);
      }).catch(function (err) { toast(err.message); });
    };
  }

  /* ----------------------------------------------------------------- tabs */

  function activateTab(container, name) {
    const key = container.id === 'consoleTabs' ? 'console' : 'tab';
    container.querySelectorAll('.tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset[key] === name);
    });
    const body = container.parentElement.querySelector('.pane-body');
    body.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.dataset.panel === name);
    });
  }

  function initTabs() {
    [['leftTabs', 'tab'], ['consoleTabs', 'console']].forEach(function (pair) {
      const container = $(pair[0]);
      container.querySelectorAll('.tab').forEach(function (btn) {
        btn.onclick = function () {
          // Clicking a tab in a collapsed console reopens it.
          if (container.id === 'consoleTabs') setConsoleCollapsed(false);
          activateTab(container, btn.dataset[pair[1]]);
        };
      });
    });
  }

  /* ------------------------------------------------------- console collapse */

  function setConsoleCollapsed(collapsed) {
    $('paneRight').classList.toggle('console-collapsed', collapsed);
    const btn = $('consoleToggle');
    btn.innerHTML = collapsed ? '&#9652;' : '&#9662;';
    btn.title = collapsed ? 'Expand the console' : 'Collapse the console';
    localStorage.setItem('ocq-console-collapsed', collapsed ? '1' : '0');
  }

  function initConsoleToggle() {
    setConsoleCollapsed(localStorage.getItem('ocq-console-collapsed') === '1');
    $('consoleToggle').onclick = function () {
      setConsoleCollapsed(!$('paneRight').classList.contains('console-collapsed'));
    };
  }

  /* -------------------------------------------------------------- splitters */

  function initSplitters() {
    const split = $('split');
    const left = $('paneLeft');
    const editorPane = $('editorPane');
    const rightPane = $('paneRight');

    const savedLeft = localStorage.getItem('ocq-split-x');
    if (savedLeft) left.style.width = savedLeft;
    const savedTop = localStorage.getItem('ocq-split-y');
    if (savedTop) editorPane.style.flex = '0 0 ' + savedTop;

    drag($('gutterV'), function (e) {
      const rect = split.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(72, Math.max(22, pct));
      left.style.width = clamped.toFixed(2) + '%';
      localStorage.setItem('ocq-split-x', clamped.toFixed(2) + '%');
    }, 'resizing');

    drag($('gutterH'), function (e) {
      const rect = rightPane.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(85, Math.max(18, pct));
      editorPane.style.flex = '0 0 ' + clamped.toFixed(2) + '%';
      localStorage.setItem('ocq-split-y', clamped.toFixed(2) + '%');
    }, 'resizing-v');
  }

  function drag(handle, onMove, bodyClass) {
    handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      handle.classList.add('dragging');
      document.body.classList.add(bodyClass);
      function move(ev) { onMove(ev); }
      function up() {
        handle.classList.remove('dragging');
        document.body.classList.remove(bodyClass);
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      }
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
  }

  /* ------------------------------------------------------------------ init */

  initTheme();
  initTabs();
  initNotesPane();
  initConsoleToggle();
  initBackups();
  initSplitters();
  $('homeBtn').onclick = function () { go('/'); };
  route();
})();
