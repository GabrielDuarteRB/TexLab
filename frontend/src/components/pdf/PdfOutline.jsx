import { useState, useEffect, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { List, ChevronRight, ChevronDown } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

async function resolveOutlineItems(doc, items) {
  const result = [];
  for (const item of items) {
    let page = 1;
    try {
      if (item.dest) {
        let dest = item.dest;
        if (typeof dest === 'string') {
          dest = await doc.getDestination(dest);
        }
        if (dest && dest[0]) {
          const pageIndex = await doc.getPageIndex(dest[0]);
          page = pageIndex + 1;
        }
      }
    } catch {}

    const children = item.items?.length > 0
      ? await resolveOutlineItems(doc, item.items)
      : [];

    result.push({ title: item.title, page, children });
  }
  return result;
}

function normalizeText(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ı]/g, 'i').replace(/[İ]/g, 'I')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function extractWords(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ı]/g, 'i').replace(/[İ]/g, 'I')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

function hasAllWordsInOrder(pageWords, needleWords) {
  if (needleWords.length === 0) return false;
  let ni = 0;
  for (let i = 0; i < pageWords.length && ni < needleWords.length; i++) {
    if (pageWords[i] === needleWords[ni]) ni++;
  }
  return ni === needleWords.length;
}

function parseSections(fileContents, currentFile) {
  const sections = [];
  const visited = new Set();

  const resolvePath = (from, inputPath) => {
    let cleaned = inputPath.replace(/[{}]/g, '').trim();
    if (!cleaned.endsWith('.tex')) cleaned += '.tex';
    const fromDir = from.substring(0, from.lastIndexOf('/'));
    return fromDir ? `${fromDir}/${cleaned}` : cleaned;
  };

  const parse = (filePath, content) => {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const inputMatch = line.match(/\\input\{([^}]+)\}/);
      if (inputMatch) {
        const resolved = resolvePath(filePath, inputMatch[1]);
        if (fileContents[resolved]) {
          parse(resolved, fileContents[resolved]);
        }
        continue;
      }

      const sectionMatch = line.match(/\\(section|subsection|subsubsection)\*?\{([^}]+)\}/);
      if (sectionMatch) {
        const level = sectionMatch[1] === 'section' ? 0 : sectionMatch[1] === 'subsection' ? 1 : 2;
        sections.push({ title: sectionMatch[2], level, file: filePath });
      }
    }
  };

  if (currentFile && fileContents[currentFile]) {
    parse(currentFile, fileContents[currentFile]);
  }

  return sections;
}

async function findSectionPages(doc, sections) {
  const numPages = doc.numPages;
  const BATCH = 8;
  const pageTexts = new Array(numPages);

  for (let batchStart = 0; batchStart < numPages; batchStart += BATCH) {
    const batchEnd = Math.min(batchStart + BATCH, numPages);
    const promises = [];
    for (let p = batchStart; p < batchEnd; p++) {
      promises.push(
        doc.getPage(p + 1).then(page =>
          page.getTextContent().then(content => {
            pageTexts[p] = content.items.map(item => item.str).join(' ');
          })
        )
      );
    }
    await Promise.all(promises);
  }

  const normalizedTexts = pageTexts.map(t => normalizeText(t || ''));
  const wordTexts = pageTexts.map(t => extractWords(t || ''));
  const pageMap = {};

  for (const section of sections) {
    const needle = normalizeText(section.title);
    let found = false;

    for (let p = 0; p < numPages; p++) {
      if (normalizedTexts[p].includes(needle)) {
        pageMap[section.title] = p + 1;
        found = true;
        break;
      }
    }

    if (!found) {
      const needleWords = extractWords(section.title);
      for (let p = 0; p < numPages; p++) {
        if (hasAllWordsInOrder(wordTexts[p], needleWords)) {
          pageMap[section.title] = p + 1;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      pageMap[section.title] = 1;
    }
  }

  return pageMap;
}

function OutlineItem({ item, depth, onNavigate, expanded, onToggle }) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expanded.has(item.title + item.page);

  return (
    <li className={`pdf-outline-item level-${Math.min(depth, 3)}`}>
      <div className="outline-item-row">
        {hasChildren ? (
          <button
            className="outline-expand-btn"
            onClick={(e) => { e.stopPropagation(); onToggle(item.title + item.page); }}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="outline-expand-spacer" />
        )}
        <button
          className="outline-text-btn"
          onClick={() => onNavigate(item.page)}
        >
          <span className="outline-text">{item.title}</span>
        </button>
      </div>
      {hasChildren && isExpanded && (
        <ul className="pdf-outline-list">
          {item.children.map((child, i) => (
            <OutlineItem
              key={i}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function TexSectionItem({ item, depth, onNavigate }) {
  return (
    <li className={`pdf-outline-item level-${Math.min(depth, 3)}`}>
      <div className="outline-item-row">
        <span className="outline-expand-spacer" />
        <button
          className="outline-text-btn"
          onClick={() => onNavigate(item.page)}
        >
          <span className="outline-text">{item.title}</span>
        </button>
      </div>
    </li>
  );
}

export default function PdfOutline() {
  const { pdfUrl, setPageNumber, pdfPageCount, fileContents, currentFile } = useProjectStore();
  const [outline, setOutline] = useState([]);
  const [texSections, setTexSections] = useState([]);
  const [source, setSource] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    if (!pdfUrl) {
      setOutline([]);
      setTexSections([]);
      setSource(null);
      return;
    }

    let cancelled = false;

    const loadOutline = async () => {
      try {
        const loadingTask = pdfjs.getDocument(pdfUrl);
        const doc = await loadingTask.promise;
        const raw = await doc.getOutline();

        if (raw && raw.length > 0 && !cancelled) {
          const resolved = await resolveOutlineItems(doc, raw);
          setOutline(resolved);
          setTexSections([]);
          setSource('pdf');
          return;
        }

        if (cancelled) return;

        const sections = parseSections(fileContents, currentFile);
        if (sections.length > 0) {
          const pageMap = await findSectionPages(doc, sections);
          console.log('[PdfOutline] pageMap:', pageMap);
          const withPages = sections.map(s => ({
            ...s,
            page: pageMap[s.title] || 1,
          }));
          setTexSections(withPages);
          setOutline([]);
          setSource('tex');
        } else {
          setOutline([]);
          setTexSections([]);
          setSource(null);
        }
      } catch (err) {
        console.error('[PdfOutline] error:', err);
        if (!cancelled) {
          const sections = parseSections(fileContents, currentFile);
          if (sections.length > 0) {
            try {
              const pageMap = await findSectionPages(doc, sections);
              const withPages = sections.map(s => ({
                ...s,
                page: pageMap[s.title] || 1,
              }));
              setTexSections(withPages);
              setSource('tex');
            } catch {
              const withPages = sections.map((s, i) => ({
                ...s,
                page: i + 1,
              }));
              setTexSections(withPages);
              setSource('tex');
            }
          } else {
            setOutline([]);
            setTexSections([]);
            setSource(null);
          }
        }
      }
    };

    loadOutline();
    return () => { cancelled = true; };
  }, [pdfUrl, currentFile, pdfPageCount]);

  const handleToggle = useCallback((key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleNavigate = useCallback((page) => {
    setPageNumber(page);
  }, [setPageNumber]);

  const items = source === 'pdf' ? outline : source === 'tex' ? texSections : [];

  if (items.length === 0) {
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
        {source === 'pdf'
          ? items.map((item, i) => (
              <OutlineItem
                key={i}
                item={item}
                depth={0}
                onNavigate={handleNavigate}
                expanded={expanded}
                onToggle={handleToggle}
              />
            ))
          : items.map((item, i) => (
              <TexSectionItem
                key={i}
                item={item}
                depth={item.level}
                onNavigate={handleNavigate}
              />
            ))
        }
      </ul>
    </div>
  );
}
