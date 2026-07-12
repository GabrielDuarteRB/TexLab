import { useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import useProjectStore from '../store/useProjectStore.js';

const DEBOUNCE_MS = 800;
const MIN_LENGTH = 4;

function isCheckableFile(filename) {
  if (!filename) return false;
  return /\.(tex|bib)$/i.test(filename);
}

/**
 * Converte diagnósticos LSP (line/character) do backend em offsets de caractere
 * compatíveis com String.prototype.slice e com o Monaco.
 *
 * O backend (ltexClient.js convertDiagnostic) já devolve startOffset/endOffset
 * como índices de caractere UTF-16, mas como proteção extra (caso o backend
 * seja atualizado) recalculamos aqui a partir de range se necessário.
 */
function diagnosticToMarker(d, text) {
  if (typeof d.startOffset === 'number' && typeof d.endOffset === 'number') {
    return {
      startOffset: d.startOffset,
      endOffset: d.endOffset,
      message: d.message || '',
      suggestions: d.suggestions || [],
      severity: d.severity || 'warning',
    };
  }

  if (d.range && typeof d.range.start?.line === 'number') {
    const lines = text.split('\n');
    const toCharIndex = (line, character) => {
      let index = 0;
      for (let i = 0; i < line && i < lines.length; i++) {
        index += lines[i].length + 1;
      }
      return index + (character || 0);
    };
    return {
      startOffset: toCharIndex(d.range.start.line, d.range.start.character),
      endOffset: toCharIndex(d.range.end.line, d.range.end.character),
      message: d.message || '',
      suggestions: d.suggestions || [],
      severity: d.severity || 'warning',
    };
  }

  return null;
}

/**
 * Hook de revisão ortográfica em tempo real.
 *
 * - Observa `currentFile` e `content`.
 * - Aguarda `DEBOUNCE_MS` ms de inatividade antes de chamar o backend.
 * - Cancela requests anteriores via AbortController.
 * - Atualiza `editorMarkers` no store, que o TexLabEditor renderiza no Monaco.
 *
 * @param {Object} params
 * @param {string|null} params.currentFile - Caminho do arquivo aberto.
 * @param {string} params.content - Conteúdo atual do arquivo.
 * @param {boolean} [params.enabled=true] - Se false, limpa markers e não checa.
 */
export function useRealtimeSpellCheck({ currentFile, content, enabled = true }) {
  const setEditorMarkers = useProjectStore((s) => s.setEditorMarkers);
  const clearEditorMarkers = useProjectStore((s) => s.clearEditorMarkers);
  const setSpellChecking = useProjectStore((s) => s.setSpellChecking);
  const ltexStatus = useProjectStore((s) => s.ltexStatus);
  const setLtexStatus = useProjectStore((s) => s.setLtexStatus);

  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const lastFileRef = useRef(null);

  // Busca o status do ltex uma vez (debounce leve na primeira renderização)
  useEffect(() => {
    if (ltexStatus !== null) return;
    let cancelled = false;
    api.aiLtexStatus()
      .then((status) => {
        if (!cancelled) setLtexStatus(status);
      })
      .catch(() => {
        if (!cancelled) setLtexStatus({ disponivel: false, erro: 'Falha ao contatar backend' });
      });
    return () => {
      cancelled = true;
    };
  }, [ltexStatus, setLtexStatus]);

  // Trocou de arquivo → limpa markers imediatamente
  useEffect(() => {
    if (lastFileRef.current !== null && lastFileRef.current !== currentFile) {
      clearEditorMarkers();
    }
    lastFileRef.current = currentFile;
  }, [currentFile, clearEditorMarkers]);

  // Toggle off → limpa markers existentes
  useEffect(() => {
    if (!enabled) {
      clearEditorMarkers();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setSpellChecking(false);
    }
  }, [enabled, clearEditorMarkers, setSpellChecking]);

  // Debounce + chamada
  useEffect(() => {
    if (!enabled) return;
    if (!isCheckableFile(currentFile)) return;
    if (ltexStatus && ltexStatus.disponivel === false) return;
    if (typeof content !== 'string' || content.length < MIN_LENGTH) {
      clearEditorMarkers();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSpellChecking(true);
      try {
        const languageId = currentFile.toLowerCase().endsWith('.bib') ? 'bibtex' : 'latex';
        const res = await api.aiLtexCheck(content, languageId, 'pt-BR', {
          signal: controller.signal,
          includeSuggestions: false,
        });
        if (controller.signal.aborted) return;
        const diagnostics = res.diagnostics || [];
        const markers = diagnostics
          .map((d) => diagnosticToMarker(d, content))
          .filter(Boolean);
        setEditorMarkers(markers);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('[RealtimeSpellCheck] falha:', err.message);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setSpellChecking(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentFile, content, enabled, ltexStatus, setEditorMarkers, clearEditorMarkers, setSpellChecking]);

  // Cleanup final
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);
}
