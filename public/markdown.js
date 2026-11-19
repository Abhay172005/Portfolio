/* Small, safe Markdown renderer for blog posts (shared by the admin preview and post page).
   All text is HTML-escaped first, so raw HTML in a post is shown as text, never executed.
   Supports: headings, paragraphs, **bold**, *italic*, ~~strike~~, `code`, fenced code blocks,
   links, images, blockquotes, bullet/numbered lists and horizontal rules. */
(function (global) {
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Only allow web, mail, relative and anchor links — never javascript: or data: URLs.
  const safeUrl = (url) => {
    const u = url.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^(https?:|mailto:)/i.test(u)) return "#";
    return u;
  };

  function inline(text) {
    const codes = [];
    let s = text.replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`);
    s = escapeHtml(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy">`);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, "$1<em>$2</em>");
    s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`);
  }

  function renderMarkdown(source) {
    const lines = String(source || "").replace(/\r/g, "").split("\n");
    const out = [];
    let i = 0;

    const isBlockStart = (line) => /^(#{1,6}\s|>|```|~~~|\s*([-*+]|\d+[.)])\s|(-{3,}|\*{3,}|_{3,})\s*$)/.test(line);

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) { i += 1; continue; }

      const fence = line.match(/^(```|~~~)\s*([\w+-]*)/);
      if (fence) {
        const body = [];
        i += 1;
        while (i < lines.length && !lines[i].startsWith(fence[1])) { body.push(lines[i]); i += 1; }
        i += 1;
        const lang = fence[2] ? ` data-lang="${escapeHtml(fence[2])}"` : "";
        out.push(`<pre${lang}><code>${escapeHtml(body.join("\n"))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*$/);
      if (heading) {
        // The post title is the page's <h1>, so "#" and "##" both become <h2>.
        const level = Math.max(2, heading[1].length);
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        i += 1;
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push("<hr>"); i += 1; continue; }

      if (line.startsWith(">")) {
        const quote = [];
        while (i < lines.length && lines[i].startsWith(">")) { quote.push(lines[i].replace(/^>\s?/, "")); i += 1; }
        out.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
        continue;
      }

      const listItem = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
      if (listItem) {
        const ordered = /\d/.test(listItem[1]);
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
          if (m && /\d/.test(m[1]) === ordered) { items.push(m[2]); i += 1; continue; }
          if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) { items[items.length - 1] += ` ${lines[i].trim()}`; i += 1; continue; }
          break;
        }
        const tag = ordered ? "ol" : "ul";
        out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
        continue;
      }

      const para = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { para.push(lines[i].trim()); i += 1; }
      out.push(`<p>${inline(para.join(" "))}</p>`);
    }
    return out.join("\n");
  }

  const readingTime = (source) => Math.max(1, Math.round(String(source || "").trim().split(/\s+/).filter(Boolean).length / 200));

  global.renderMarkdown = renderMarkdown;
  global.readingTime = readingTime;
})(window);
