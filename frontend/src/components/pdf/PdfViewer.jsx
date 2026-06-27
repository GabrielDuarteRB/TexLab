import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore.js';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer() {
  const { pdfUrl, pageNumber, pdfPageCount, setPageNumber, setPdfPageCount } = useProjectStore();
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.deltaY > 0) {
        setPageNumber(Math.min(pdfPageCount, pageNumber + 1));
      } else if (e.deltaY < 0) {
        setPageNumber(Math.max(1, pageNumber - 1));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: true });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [pageNumber, pdfPageCount, setPageNumber]);

  if (!pdfUrl) {
    return (
      <div className="pdf-empty">
        <p>Nenhum PDF disponível. Compile o projeto primeiro.</p>
      </div>
    );
  }

  function onDocumentLoadSuccess({ numPages: total }) {
    setPdfPageCount(total);
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1}>
          <ChevronLeft size={16} />
        </button>
        <span>
          {pageNumber} / {pdfPageCount || '-'}
        </span>
        <button
          onClick={() => setPageNumber(Math.min(pdfPageCount || 1, pageNumber + 1))}
          disabled={pageNumber >= (pdfPageCount || 1)}
        >
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setScale(Math.max(0.5, scale - 0.1))}>
          <ZoomOut size={16} />
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(Math.min(2, scale + 0.1))}>
          <ZoomIn size={16} />
        </button>
      </div>
      <div className="pdf-container" ref={containerRef}>
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="pdf-empty"><p>Carregando PDF...</p></div>}
          error={<div className="pdf-empty"><p>Erro ao carregar PDF.</p></div>}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>
    </div>
  );
}
