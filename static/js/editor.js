/* A small Python code editor: syntax highlighting, line numbers, smart indent,
   bracket completion. Built on a textarea so undo/redo and IME stay native. */
window.CodeEditor = (function () {
  const INDENT = '    ';
  const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
  const CLOSERS = new Set([')', ']', '}', '"', "'"]);

  function CodeEditor(host, options) {
    options = options || {};
    this.onChange = options.onChange || function () {};
    this.onRun = options.onRun || function () {};
    this.onSubmit = options.onSubmit || function () {};

    host.innerHTML =
      '<div class="ed">' +
        '<div class="ed-gutter"><div class="ed-gutter-inner"></div></div>' +
        '<div class="ed-scroll">' +
          '<div class="ed-sizer">' +
            '<pre class="ed-layer ed-hl"><code></code></pre>' +
            '<textarea class="ed-layer ed-input" spellcheck="false" ' +
              'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
              'wrap="off"></textarea>' +
          '</div>' +
        '</div>' +
      '</div>';

    this.root = host.firstChild;
    this.gutter = this.root.querySelector('.ed-gutter-inner');
    this.scroll = this.root.querySelector('.ed-scroll');
    this.code = this.root.querySelector('.ed-hl code');
    this.input = this.root.querySelector('.ed-input');

    // Every edit path goes through setValue/replace, so undo is ours to keep.
    this.history = [];
    this.hIndex = -1;
    this.lastRecord = 0;

    const self = this;
    this.input.addEventListener('input', function () {
      self.record(true);
      self.sync();
      self.onChange(self.getValue());
    });
    this.input.addEventListener('keydown', function (e) { self.onKeyDown(e); });
    this.scroll.addEventListener('scroll', function () {
      self.gutter.style.transform = 'translateY(' + -self.scroll.scrollTop + 'px)';
    });

    this.setValue(options.value || '');
  }

  CodeEditor.prototype.getValue = function () {
    return this.input.value;
  };

  CodeEditor.prototype.setValue = function (text) {
    this.input.value = text == null ? '' : String(text);
    this.record(false);
    this.sync();
  };

  CodeEditor.prototype.focus = function () {
    this.input.focus();
  };

  CodeEditor.prototype.sync = function () {
    const text = this.input.value;
    // Trailing newline keeps the highlight layer as tall as the textarea.
    this.code.innerHTML = window.HL.python(text + '\n');
    const lines = text.split('\n').length;
    if (this._lines !== lines) {
      this._lines = lines;
      let nums = '';
      for (let i = 1; i <= lines; i++) nums += i + '\n';
      this.gutter.textContent = nums;
    }
  };

  /* ----------------------------------------------------------- undo history */

  const COALESCE_MS = 450;
  const HISTORY_LIMIT = 400;

  CodeEditor.prototype.record = function (coalesce) {
    const snap = {
      value: this.input.value,
      start: this.input.selectionStart,
      end: this.input.selectionEnd
    };
    const top = this.history[this.hIndex];

    if (top && top.value === snap.value) {  // caret-only move
      top.start = snap.start;
      top.end = snap.end;
      return;
    }

    this.history.length = this.hIndex + 1;  // typing after undo drops the redo tail
    const now = Date.now();
    if (coalesce && top && now - this.lastRecord < COALESCE_MS) {
      this.history[this.hIndex] = snap;     // fold this keystroke into the last step
    } else {
      this.history.push(snap);
      this.hIndex++;
    }
    this.lastRecord = coalesce ? now : 0;

    if (this.history.length > HISTORY_LIMIT) {
      this.history.shift();
      this.hIndex--;
    }
  };

  CodeEditor.prototype.restore = function (step) {
    const next = this.hIndex + step;
    if (next < 0 || next >= this.history.length) return;
    this.hIndex = next;
    const snap = this.history[next];
    this.input.value = snap.value;
    this.input.setSelectionRange(snap.start, snap.end);
    this.lastRecord = 0;
    this.sync();
    this.scrollCaretIntoView();
    this.onChange(this.getValue());
  };

  /* ------------------------------------------------------------ edit helpers */

  CodeEditor.prototype.replace = function (start, end, text, caret) {
    this.record(false);  // capture the pre-edit state
    const value = this.input.value;
    this.input.value = value.slice(0, start) + text + value.slice(end);
    this.input.setSelectionRange(
      caret == null ? start + text.length : caret,
      caret == null ? start + text.length : caret
    );
    this.record(false);
    this.sync();
    this.scrollCaretIntoView();
    this.onChange(this.getValue());
  };

  /* Keep the caret visible: the textarea itself never scrolls (overflow is
     hidden), so the surrounding .ed-scroll has to be nudged by hand. */
  CodeEditor.prototype.scrollCaretIntoView = function () {
    const value = this.input.value;
    const pos = this.input.selectionStart;
    const lineHeight = 20;
    const padTop = 12;
    const line = value.slice(0, pos).split('\n').length - 1;
    const top = padTop + line * lineHeight;
    const view = this.scroll;
    if (top < view.scrollTop + lineHeight) {
      view.scrollTop = Math.max(0, top - lineHeight);
    } else if (top + lineHeight > view.scrollTop + view.clientHeight - lineHeight) {
      view.scrollTop = top + 2 * lineHeight - view.clientHeight;
    }
  };

  function lineStartOf(text, pos) {
    return text.lastIndexOf('\n', pos - 1) + 1;
  }

  /* --------------------------------------------------------------- key logic */

  CodeEditor.prototype.onKeyDown = function (e) {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      return this.restore(e.shiftKey ? 1 : -1);
    }
    if (mod && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      return this.restore(1);
    }
    if (mod && e.key === 'Enter') {
      e.preventDefault();
      return e.shiftKey ? this.onSubmit() : this.onRun();
    }
    if (mod && e.key === '/') {
      e.preventDefault();
      return this.toggleComment();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      return this.handleTab(e.shiftKey);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      return this.handleEnter();
    }
    if (e.key === 'Backspace') {
      return this.handleBackspace(e);
    }
    if (PAIRS[e.key] || CLOSERS.has(e.key)) {
      return this.handleBracket(e);
    }
  };

  CodeEditor.prototype.handleTab = function (dedent) {
    const el = this.input;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const multiline = value.slice(start, end).indexOf('\n') !== -1;

    if (!multiline && !dedent) {
      return this.replace(start, end, INDENT, start + INDENT.length);
    }

    const from = lineStartOf(value, start);
    let to = value.indexOf('\n', end);
    if (to === -1) to = value.length;

    const block = value.slice(from, to);
    let removedFirst = 0;
    let delta = 0;
    const shifted = block.split('\n').map(function (line, i) {
      if (dedent) {
        const match = line.match(/^( {1,4}|\t)/);
        const cut = match ? match[0].length : 0;
        if (i === 0) removedFirst = cut;
        delta -= cut;
        return line.slice(cut);
      }
      if (i === 0) removedFirst = -INDENT.length;
      delta += INDENT.length;
      return line.trim() === '' && i > 0 ? line : INDENT + line;
    }).join('\n');

    this.replace(from, to, shifted);
    el.setSelectionRange(
      Math.max(from, start - removedFirst),
      Math.max(from, end + delta)
    );
  };

  CodeEditor.prototype.handleEnter = function () {
    const el = this.input;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const from = lineStartOf(value, start);
    const line = value.slice(from, start);

    let indent = (line.match(/^[ \t]*/) || [''])[0];
    const trimmed = line.trim();
    if (/[:([{]$/.test(trimmed)) indent += INDENT;
    if (/^(return|break|continue|pass|raise)\b/.test(trimmed)) {
      indent = indent.slice(0, Math.max(0, indent.length - INDENT.length));
    }

    // Typing Enter between a bracket pair opens a body and a closing line.
    const before = value[start - 1];
    const after = value[end];
    if (before && after && PAIRS[before] === after) {
      const outer = (line.match(/^[ \t]*/) || [''])[0];
      const text = '\n' + outer + INDENT + '\n' + outer;
      return this.replace(start, end, text, start + 1 + outer.length + INDENT.length);
    }

    this.replace(start, end, '\n' + indent, start + 1 + indent.length);
  };

  CodeEditor.prototype.handleBackspace = function (e) {
    const el = this.input;
    if (el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart;
    const value = el.value;

    const before = value[pos - 1];
    const after = value[pos];
    if (before && after && PAIRS[before] === after) {
      e.preventDefault();
      return this.replace(pos - 1, pos + 1, '', pos - 1);
    }

    const from = lineStartOf(value, pos);
    const prefix = value.slice(from, pos);
    if (prefix.length >= INDENT.length && /^ +$/.test(prefix) &&
        prefix.length % INDENT.length === 0) {
      e.preventDefault();
      return this.replace(pos - INDENT.length, pos, '', pos - INDENT.length);
    }
  };

  CodeEditor.prototype.handleBracket = function (e) {
    const el = this.input;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const open = PAIRS[e.key];

    // Typing the closing character where one already sits just steps over it.
    if (start === end && CLOSERS.has(e.key) && value[start] === e.key) {
      const isQuote = e.key === '"' || e.key === "'";
      if (!isQuote || value[start - 1] !== '\\') {
        e.preventDefault();
        el.setSelectionRange(start + 1, start + 1);
        return;
      }
    }
    if (!open) return;

    if (start !== end) {  // wrap the selection
      e.preventDefault();
      const selected = value.slice(start, end);
      this.replace(start, end, e.key + selected + open);
      el.setSelectionRange(start + 1, end + 1);
      return;
    }

    // Don't auto-close a quote in the middle of a word.
    const next = value[start] || '';
    if (/[\w"']/.test(next)) return;

    e.preventDefault();
    this.replace(start, end, e.key + open, start + 1);
  };

  CodeEditor.prototype.toggleComment = function () {
    const el = this.input;
    const value = el.value;
    const from = lineStartOf(value, el.selectionStart);
    let to = value.indexOf('\n', el.selectionEnd);
    if (to === -1) to = value.length;

    const lines = value.slice(from, to).split('\n');
    const meaningful = lines.filter(function (l) { return l.trim(); });
    const allCommented = meaningful.length > 0 &&
      meaningful.every(function (l) { return /^\s*#/.test(l); });

    const next = lines.map(function (line) {
      if (!line.trim()) return line;
      if (allCommented) return line.replace(/^(\s*)#\s?/, '$1');
      const indent = (line.match(/^\s*/) || [''])[0];
      return indent + '# ' + line.slice(indent.length);
    }).join('\n');

    this.replace(from, to, next);
    el.setSelectionRange(from, from + next.length);
  };

  return CodeEditor;
})();
