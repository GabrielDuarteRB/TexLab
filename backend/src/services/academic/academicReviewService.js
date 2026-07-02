import { ollamaDisponivel, chamarOllama } from './ollamaClient.js';
import { groqDisponivel, chamarGroq } from './groqClient.js';
import { getSystemPrompt, extrairJson } from './promptBuilder.js';
import { chunkText } from './chunker.js';
import { detectarRepeticoesLocais, deduplicarPalavras } from './localRepetitionDetector.js';

async function detectarBackend(opcao = 'auto') {
  if (opcao === 'ollama' && await ollamaDisponivel()) {
    return { backend: 'ollama', chamar: chamarOllama };
  }
  if (opcao === 'groq' && groqDisponivel()) {
    return { backend: 'groq', chamar: chamarGroq };
  }
  if (await ollamaDisponivel()) {
    return { backend: 'ollama', chamar: chamarOllama };
  }
  if (groqDisponivel()) {
    return { backend: 'groq', chamar: chamarGroq };
  }
  throw new Error(
    'Nenhum backend de IA disponível. Instale Ollama (ollama.com) ' +
    'ou configure GROQ_API_KEY no .env'
  );
}

function parseLatex(texto) {
  let limpo = texto;

  const envsParaRemover = [
    'equation', 'equation*', 'align', 'align*', 'gather', 'gather*',
    'multline', 'multline*', 'flalign', 'flalign*',
    'tikzpicture', 'figure', 'table', 'lstlisting', 'verbatim',
    'algorithm', 'algorithmic',
  ];

  for (const env of envsParaRemover) {
    const regex = new RegExp(`\\\\begin{${env.replace(/\*/g, '\\*')}}.*?\\\\end{${env.replace(/\*/g, '\\*')}}`, 'gs');
    limpo = limpo.replace(regex, ' ');
  }

  limpo = limpo.replace(/\$[^$]*\$/g, ' ');
  limpo = limpo.replace(/\$\$[^$]*\$\$/g, ' ');
  limpo = limpo.replace(/\\\[.*?\\\]/gs, ' ');
  limpo = limpo.replace(/\\cite\{[^}]*\}/g, ' CITACAO ');
  limpo = limpo.replace(/\\ref\{[^}]*\}/g, ' REFERENCIA ');
  limpo = limpo.replace(/\\label\{[^}]*\}/g, ' ');
  limpo = limpo.replace(/\\textbf\{([^}]*)\}/g, '$1');
  limpo = limpo.replace(/\\textit\{([^}]*)\}/g, '$1');
  limpo = limpo.replace(/\\emph\{([^}]*)\}/g, '$1');
  limpo = limpo.replace(/\\(?:[a-zA-Z]+(?:\{[^}]*\})?)/g, ' ');
  limpo = limpo.replace(/\s+/g, ' ').trim();

  return limpo;
}

async function processarChunk(chunk, idioma, chamarLLM, maxRetries = 3) {
  const systemPrompt = getSystemPrompt(idioma);

  for (let tentativa = 0; tentativa < maxRetries; tentativa++) {
    try {
      const resposta = await chamarLLM(systemPrompt, chunk.text);
      const dados = extrairJson(resposta);
      if (dados) return dados;
    } catch (err) {
      if (tentativa === maxRetries - 1) throw err;
    }
  }
  return null;
}

const CONCORRENCIA_MAX = 3;

async function processarEmParalelo(chunks, idioma, chamarLLM) {
  const resultadosLLM = new Map();
  const erros = [];
  const fila = [...chunks];
  const ativos = new Set();

  while (fila.length > 0 || ativos.size > 0) {
    while (fila.length > 0 && ativos.size < CONCORRENCIA_MAX) {
      const chunk = fila.shift();
      const promessa = processarChunk(chunk, idioma, chamarLLM)
        .then(dados => {
          if (dados) {
            resultadosLLM.set(chunk.index, dados);
          } else {
            erros.push(chunk.index);
          }
        })
        .catch(err => {
          console.error(`[AcademicReview] Erro chunk ${chunk.index}:`, err.message);
          erros.push(chunk.index);
        })
        .finally(() => ativos.delete(promessa));
      ativos.add(promessa);
    }
    if (ativos.size > 0) {
      await Promise.race(ativos);
    }
  }

  return { resultadosLLM, erros };
}

export async function revisarTexto(texto, idioma = 'pt', opcaoBackend = 'auto') {
  const textoLimpo = texto.includes('\\begin{') || texto.includes('\\section')
    ? parseLatex(texto)
    : texto;

  const paragrafos = textoLimpo.split('\n').filter(p => p.trim());
  const chunks = chunkText(paragrafos);

  const backend = await detectarBackend(opcaoBackend);
  console.log(`[AcademicReview] Backend: ${backend.backend}, Chunks: ${chunks.length}, Concorrência: ${CONCORRENCIA_MAX}`);

  const { resultadosLLM, erros } = await processarEmParalelo(chunks, idioma, backend.chamar);

  const textoCorrigido = [];
  const todasVariacoes = [];
  const todasSugestoes = [];
  const palavrasRepetidasLLM = [];
  const todasCorrecoes = [];

  for (const chunk of chunks) {
    const dados = resultadosLLM.get(chunk.index);
    if (dados) {
      textoCorrigido.push(dados.texto_corrigido || chunk.text);
      if (Array.isArray(dados.variacoes)) todasVariacoes.push(...dados.variacoes);
      if (Array.isArray(dados.sugestoes_melhoria)) todasSugestoes.push(...dados.sugestoes_melhoria);
      if (Array.isArray(dados.correcoes)) todasCorrecoes.push(...dados.correcoes);
      if (Array.isArray(dados.palavras_repetidas)) {
        for (const r of dados.palavras_repetidas) {
          if (r && r.palavra) {
            palavrasRepetidasLLM.push({
              palavra: r.palavra,
              lema: r.palavra,
              ocorrencias: r.ocorrencias || 1,
              paragrafos: r.paragrafos || [chunk.index],
              sugestoes: Array.isArray(r.sugestoes) ? r.sugestoes : [],
              fonte: 'llm',
            });
          }
        }
      }
    } else {
      textoCorrigido.push(chunk.text);
    }
  }

  const repeticoesLocais = detectarRepeticoesLocais(paragrafos, idioma);
  const todasRepeticoes = deduplicarPalavras([...palavrasRepetidasLLM, ...repeticoesLocais]);

  return {
    texto_corrigido: textoCorrigido.join('\n\n'),
    correcoes: todasCorrecoes.slice(0, 30),
    variacoes: todasVariacoes.slice(0, 8),
    palavras_repetidas: todasRepeticoes.slice(0, 20),
    sugestoes_melhoria: todasSugestoes.slice(0, 15),
    erros,
    total_chunks: chunks.length,
    chunks_processados: resultadosLLM.size,
    backend_usado: backend.backend,
  };
}
