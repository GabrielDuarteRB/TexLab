function escapeHtml(str) {
  return str.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code class="smd-code">${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong>${bold}</strong>`);
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return out;
}

export default function SimpleMarkdown({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      blocks.push(<h3 key={i} className="smd-h3" dangerouslySetInnerHTML={{ __html: renderInline(h3[1]) }} />);
      i++;
      continue;
    }

    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      blocks.push(<h2 key={i} className="smd-h2" dangerouslySetInnerHTML={{ __html: renderInline(h2[1]) }} />);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={i} className="smd-list">
          {items.map((it, k) => (
            <li key={k} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
          ))}
        </ul>
      );
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^[-*]\s+/.test(lines[i]) && !/^##\s+/.test(lines[i]) && !/^###\s+/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={i} className="smd-p" dangerouslySetInnerHTML={{ __html: renderInline(para.join(' ')) }} />
    );
  }

  return <div className="smd">{blocks}</div>;
}
