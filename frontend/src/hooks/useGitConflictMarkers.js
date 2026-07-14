import { useEffect, useRef } from 'react';
import useProjectStore from '../store/useProjectStore.js';

const MARKER_SOURCE = 'git';
const CONFLICT_REGEX = /^<<<<<<<[^\n]*\n[\s\S]*?^>>>>>>>[^\n]*$/gm;

function findConflictRegions(content) {
  if (!content || typeof content !== 'string') return [];
  const regions = [];
  CONFLICT_REGEX.lastIndex = 0;
  let match;
  while ((match = CONFLICT_REGEX.exec(content)) !== null) {
    regions.push({
      startOffset: match.index,
      endOffset: match.index + match[0].length,
    });
  }
  return regions;
}

function offsetToLineCol(text, offset) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 0x0a) {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, column: col };
}

export function useGitConflictMarkers() {
  const setEditorMarkers = useProjectStore((s) => s.setEditorMarkers);
  const clearEditorMarkers = useProjectStore((s) => s.clearEditorMarkers);
  const currentFile = useProjectStore((s) => s.currentFile);
  const fileContents = useProjectStore((s) => s.fileContents);
  const gitConflictFiles = useProjectStore((s) => s.gitConflictFiles);
  const realtimeCheckEnabled = useProjectStore((s) => s.realtimeCheckEnabled);
  const previousFileRef = useRef(null);

  useEffect(() => {
    if (previousFileRef.current !== null && previousFileRef.current !== currentFile) {
      clearEditorMarkers();
    }
    previousFileRef.current = currentFile;
  }, [currentFile, clearEditorMarkers]);

  useEffect(() => {
    if (!currentFile) return;

    const inConflictList = gitConflictFiles.includes(currentFile);
    const content = fileContents[currentFile];
    const regions = (inConflictList && typeof content === 'string')
      ? findConflictRegions(content)
      : [];

    if (!regions.length) {
      const filtered = useProjectStore.getState().editorMarkers.filter((m) => m.source !== MARKER_SOURCE);
      const current = useProjectStore.getState().editorMarkers;
      if (current.length !== filtered.length) {
        setEditorMarkers(filtered);
      }
      return;
    }

    const markers = regions.map((r) => {
      const start = offsetToLineCol(content, r.startOffset);
      const end = offsetToLineCol(content, r.endOffset);
      return {
        severity: 4,
        message: 'Conflito Git — escolha uma versão ou combine manualmente',
        startLineNumber: start.line,
        startColumn: start.column,
        endLineNumber: end.line,
        endColumn: end.column,
        source: MARKER_SOURCE,
      };
    });

    setEditorMarkers(markers);
  }, [currentFile, fileContents, gitConflictFiles, setEditorMarkers]);
}
