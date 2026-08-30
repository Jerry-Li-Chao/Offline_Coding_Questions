/* Small markdown renderer: headings, lists, code fences, tables, blockquotes,
   inline formatting, and pass-through for <details>/<summary> blocks. */
window.MD = (function () {
  const RAW_LINE = /^<\/?(?:details|summary|br)\b[^>]*>.*$/i;
  const CODE_SLOT = '\uE000';  // private-use sentinel for code spans

  function esc(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inline(text) {
    // Pull inline code spans out first so their contents are never reformatted.
    const spans = [];
    let out = String(text).replace(/`([^`]+)`/g, function (_, code) {
      spans.push('<code>' + esc(code) + '</code>');
      return CODE_SLOT + (spans.length - 1) + CODE_SLOT;
    });

    out = esc(out);
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<em>$1</em>');
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    out = out.replace(new RegExp(CODE_SLOT + '(\\d+)' + CODE_SLOT, 'g'),
      function (_, index) { return spans[+index]; });
    return out;
  }

  function highlight(code, lang) {
    if (lang && /^py(thon)?$/i.test(lang)) return window.HL.python(code);
    return window.HL.esc(code);
  }

  function render(src) {
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    const html = [];
    let i = 0;

    function pushList(tag, items) {
      html.push('<' + tag + '>' + items.map(function (t) {
        return '<li>' + inline(t) + '</li>';
      }).join('') + '</' + tag + '>');
    }

    while (i < lines.length) {
      const line = lines[i];

      // fenced code block
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        const lang = fence[1];
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
        i++;
        html.push('<pre><code class="lang-' + esc(lang) + '">' +
          highlight(buf.join('\n'), lang) + '</code></pre>');
        continue;
      }

      if (!line.trim()) { i++; continue; }

      if (RAW_LINE.test(line.trim())) { html.push(line.trim()); i++; continue; }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        html.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>');
        i++;
        continue;
      }

      if (/^(?:---+|\*\*\*+|___+)\s*$/.test(line)) { html.push('<hr>'); i++; continue; }

      // table
      if (/\|/.test(line) && i + 1 < lines.length &&
          /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
        const cells = function (row) {
          return row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|')
            .map(function (c) { return c.trim(); });
        };
        const head = cells(line);
        i += 2;
        const body = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
          body.push(cells(lines[i++]));
        }
        html.push('<table><thead><tr>' +
          head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          body.map(function (r) {
            return '<tr>' + r.map(function (c) {
              return '<td>' + inline(c) + '</td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody></table>');
        continue;
      }

      // blockquote
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          buf.push(lines[i++].replace(/^>\s?/, ''));
        }
        html.push('<blockquote>' + render(buf.join('\n')) + '</blockquote>');
        continue;
      }

      // unordered list
      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i++].replace(/^\s*[-*+]\s+/, ''));
        }
        pushList('ul', items);
        continue;
      }

      // ordered list
      if (/^\s*\d+[.)]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
        }
        pushList('ol', items);
        continue;
      }

      // paragraph
      const buf = [];
      while (i < lines.length && lines[i].trim() &&
             !/^```/.test(lines[i]) &&
             !/^#{1,6}\s/.test(lines[i]) &&
             !/^\s*[-*+]\s+/.test(lines[i]) &&
             !/^\s*\d+[.)]\s+/.test(lines[i]) &&
             !/^>\s?/.test(lines[i]) &&
             !RAW_LINE.test(lines[i].trim()) &&
             !/^(?:---+|\*\*\*+|___+)\s*$/.test(lines[i])) {
        buf.push(lines[i++]);
      }
      if (buf.length) html.push('<p>' + inline(buf.join('\n')) + '</p>');
      else i++;
    }

    return html.join('\n');
  }

  return { render: render };
})();
