/* Minimal Python syntax highlighter — no dependencies, works offline. */
window.HL = (function () {
  const KEYWORDS = new Set([
    'False','None','True','and','as','assert','async','await','break','class',
    'continue','def','del','elif','else','except','finally','for','from',
    'global','if','import','in','is','lambda','nonlocal','not','or','pass',
    'raise','return','try','while','with','yield','match','case'
  ]);

  const BUILTINS = new Set([
    'abs','all','any','bin','bool','bytes','callable','chr','dict','divmod',
    'enumerate','filter','float','format','frozenset','getattr','hasattr',
    'hash','hex','id','input','int','isinstance','issubclass','iter','len',
    'list','map','max','min','next','object','oct','ord','pow','print','range',
    'repr','reversed','round','set','setattr','slice','sorted','str','sum',
    'tuple','type','zip','List','Dict','Set','Tuple','Optional','Any'
  ]);

  const TOKEN = new RegExp([
    /#[^\n]*/,                                            // comment
    /[rbfuRBFU]{0,2}"""[\s\S]*?(?:"""|$)/,                // triple double
    /[rbfuRBFU]{0,2}'''[\s\S]*?(?:'''|$)/,                // triple single
    /[rbfuRBFU]{0,2}"(?:\\.|[^"\\\n])*"?/,                // double
    /[rbfuRBFU]{0,2}'(?:\\.|[^'\\\n])*'?/,                // single
    /@[A-Za-z_][\w.]*/,                                   // decorator
    /\b0[xXbBoO][0-9a-fA-F_]+\b/,                         // radix literal
    /\b\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[jJ]?\b/,  // number
    /\.?\b[A-Za-z_]\w*\b/                                 // identifier
  ].map(function (r) { return r.source; }).join('|'), 'g');

  function esc(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function python(src) {
    let out = '';
    let last = 0;
    let m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src)) !== null) {
      const tok = m[0];
      if (m.index > last) out += esc(src.slice(last, m.index));
      last = m.index + tok.length;

      const c = tok[0];
      if (c === '#') {
        out += '<span class="tk-com">' + esc(tok) + '</span>';
      } else if (c === '@') {
        out += '<span class="tk-dec">' + esc(tok) + '</span>';
      } else if (/^[rbfuRBFU]{0,2}["']/.test(tok)) {
        out += '<span class="tk-str">' + esc(tok) + '</span>';
      } else if (/^\d/.test(tok)) {
        out += '<span class="tk-num">' + esc(tok) + '</span>';
      } else if (tok[0] === '.') {
        // attribute access: highlight as a call when followed by "("
        const after = src.slice(last);
        const cls = /^\s*\(/.test(after) ? 'tk-fn' : '';
        out += '.' + (cls
          ? '<span class="' + cls + '">' + esc(tok.slice(1)) + '</span>'
          : esc(tok.slice(1)));
      } else if (KEYWORDS.has(tok)) {
        out += '<span class="tk-kw">' + esc(tok) + '</span>';
      } else if (tok === 'self' || tok === 'cls') {
        out += '<span class="tk-self">' + tok + '</span>';
      } else if (BUILTINS.has(tok)) {
        out += '<span class="tk-bi">' + esc(tok) + '</span>';
      } else if (/^\s*\(/.test(src.slice(last))) {
        out += '<span class="tk-fn">' + esc(tok) + '</span>';
      } else {
        out += esc(tok);
      }
    }
    out += esc(src.slice(last));
    return out;
  }

  return { python: python, esc: esc };
})();
