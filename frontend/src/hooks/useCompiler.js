import useProjectStore from '../store/useProjectStore.js';

export function useCompiler() {
  const { compile, compiling, compileResult, pdfUrl } = useProjectStore();

  return { compile, compiling, compileResult, pdfUrl };
}
