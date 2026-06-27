import { useMemo, useState } from 'react';
import { List, ChevronRight, ChevronDown } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

function parseSections(texContent) {
  if (!texContent) return [];
  const sections = [];
  const lines = texContent.split('\n');
  const regex = /\\(?:title|section|subsection|subsubsection)\{([^}]+)\}/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    regex.lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      const text = match[1];
      const isTitle = line.includes('\\title');
      const isSub = line.includes('\\subsection');
      const isSubSub = line.includes('\\subsubsection');

      let level = 0;
      if (isTitle) level = 0;
      else if (isSubSub) level = 3;
      else if (isSub) level = 2;
      else level = 1;

      sections.push({ text, level, line: i + 1 });
    }
  }
  return sections;
}

export default function PdfOutline() {
  const { currentFile, fileContents, pdfPageCount, setPageNumber, sidebarCollapsed, toggleSidebar } = useProjectStore();
  const content = fileContents[currentFile] || '';
  const [expanded, setExpanded] = useState(new Set());

  const sections = useMemo(() => parseSections(content), [content]);

  const totalPages = pdfPageCount || 1;
  const sectionsPerPage = sections.length > 0 ? sections.length / totalPages : 1;

  const toggleExpand = (index) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleClick = (index) => {
    const page = Math.min(totalPages, Math.floor(index / sectionsPerPage) + 1);
    setPageNumber(page);
    if (!sidebarCollapsed) toggleSidebar();
  };

  const isVisible = (index) => {
    for (let i = index - 1; i >= 0; i--) {
      if (sections[i].level < sections[index].level) {
        return expanded.has(i);
      }
    }
    return true;
  };

  const hasChildren = (index) => {
    for (let i = index + 1; i < sections.length; i++) {
      if (sections[i].level <= sections[index].level) break;
      if (sections[i].level === sections[index].level + 1) return true;
    }
    return false;
  };

  if (sections.length === 0) {
    return (
      <div className="pdf-outline">
        <div className="pdf-outline-header">
          <List size={14} />
          <h3>Seções</h3>
        </div>
        <div className="pdf-outline-empty">
          <p>Nenhuma seção encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-outline">
      <div className="pdf-outline-header">
        <List size={14} />
        <h3>Seções</h3>
      </div>
      <ul className="pdf-outline-list">
        {sections.map((section, i) => {
          if (!isVisible(i)) return null;
          const expandable = hasChildren(i);
          const isExpanded = expanded.has(i);

          return (
            <li key={i} className={`pdf-outline-item level-${section.level}`}>
              <button onClick={() => expandable ? toggleExpand(i) : handleClick(i)}>
                {expandable ? (
                  isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                ) : (
                  <span style={{ width: 12 }} />
                )}
                <span className="outline-text">{section.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
