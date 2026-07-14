import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="git-panel-pagination">
      <button
        className="git-panel-pagination-btn"
        onClick={() => canPrev && onChange(page - 1)}
        disabled={!canPrev}
        title="Anterior"
      >
        <ChevronLeft size={12} />
      </button>
      <span className="git-panel-pagination-info">
        {page} / {totalPages}
      </span>
      <button
        className="git-panel-pagination-btn"
        onClick={() => canNext && onChange(page + 1)}
        disabled={!canNext}
        title="Próxima"
      >
        <ChevronRight size={12} />
      </button>
    </div>
  );
}
