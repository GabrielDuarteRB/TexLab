import { ollamaDisponivel, chamarOllama } from './academic/ollamaClient.js';
import { groqDisponivel, chamarGroq } from './academic/groqClient.js';

const CONTEXTO_LINHAS = 20;
const LINHAS_FINAIS = 15;
const LIMITE_CHARS_TRECHO = 4000;

export function extrairParteRelevante(log) {
  if (!log || typeof log !== 'string') {
    return { trecho: '', linhaErro: null, arquivoErro: null };
  }

  const linhas = log.split('\n');
  const indicesErro = [];

  for (let i = 0; i < linhas.length; i++) {
    if (/^!/.test(linhas[i])) {
      indicesErro.push(i);
    }
  }

  const blocos = [];
  const linhasUsadas = new Set();

  for (const idx of indicesErro) {
    const inicio = Math.max(0, idx - 3);
    const fim = Math.min(linhas.length - 1, idx + CONTEXTO_LINHAS);
    for (let i = inicio; i <= fim; i++) linhasUsadas.add(i);
  }

  const indicesOrdenados = [...linhasUsadas].sort((a, b) => a - b);
  let trechoBlocos = '';
  let ultimoIndice = -2;

  for (const i of indicesOrdenados) {
    if (i !== ultimoIndice + 1) trechoBlocos += '...\n';
    trechoBlocos += `${linhas[i]}\n`;
    ultimoIndice = i;
  }

  if (trechoBlocos.length > LIMITE_CHARS_TRECHO) {
    trechoBlocos = `${trechoBlocos.slice(0, LIMITE_CHARS_TRECHO)}\n... (truncado)`;
  }

  let trechoFinal = trechoBlocos;
  const ultimasLinhas = linhas.slice(-LINHAS_FINAIS).join('\n');
  if (ultimasLinhas && !trechoFinal.includes(ultimasLinhas.slice(0, 50))) {
    trechoFinal += `\n...\n${ultimasLinhas}`;
  }

  let linhaErro = null;
  let arquivoErro = null;

  if (indicesErro.length > 0) {
    const idx = indicesErro[0];
    for (let i = idx; i < Math.min(linhas.length, idx + CONTEXTO_LINHAS); i++) {
      const m = linhas[i].match(/^l\.(\d+)/);
      if (m) {
        linhaErro = parseInt(m[1], 10);
        break;
      }
    }

    for (let i = 0; i < linhas.length; i++) {
      const m = linhas[i].match(/\(\.?\.?\/([^)\s]+\.tex)/);
      if (m) {
        arquivoErro = m[1];
        break;
      }
    }
  }

  return { trecho: trechoFinal.trim(), linhaErro, arquivoErro };
}

export function montarPrompt({ logTrecho, linhaErro, arquivoErro, texContexto }) {
  const system = `Você é um especialista em LaTeX que ajuda usuários a entenderem por que uma compilação falhou. Responda SEMPRE em português do Brasil (PT-BR).

REGRAS IMPORTANTES:
1. Seja CURTO e DIRETO. Evite explicações longas de livro-texto. Foque no que especificamente está errado neste log.
2. Se não for possível identificar a causa com confiança a partir do log e contexto fornecidos, diga isso explicitamente ("não foi possível identificar a causa com confiança") em vez de inventar uma causa. Erros de LaTeX às vezes têm causa em outro arquivo/linha que não aparece aqui.
3. Use formatação Markdown leve para deixar a resposta escaneável:
   - Comece a seção de causa com "**Causa:**" (em negrito) em uma linha, seguido da explicação em 1-2 frases curtas.
   - Comece a seção de sugestão com "**Sugestão:**" (em negrito) em outra linha, seguido da correção concreta.
   - Pode usar listas com "-" quando houver múltiplos passos ou causas.
   - Não use cabeçalhos (#) nem blocos > de citação.
4. Se você consegue identificar o trecho EXATO que contém o erro (uma substring copiada literalmente do arquivo fornecido, marcada com >>>), retorne-o neste formato logo após sua explicação em texto:

   <<<correction>>>
   original: <texto exato, copiado literalmente do trecho fornecido>
   replacement: <texto corrigido, apenas o fragmento que muda>
   <<</correction>>>

   IMPORTANTE:
   - "original" deve ser uma cópia IDÊNTICA (case, espaços, acentos) de parte do texto que veio no trecho do .tex. A aplicação usará busca exata.
   - "replacement" deve conter APENAS o fragmento corrigido. NÃO inclua a linha inteira, NÃO inclua texto antes/depois que já estava correto.
   - Se você não tem certeza do trecho exato, OMITA o bloco <<<correction>>>. Apenas descreva a correção na seção Sugestão.
5. Não invente comandos ou pacotes. Baseie-se apenas no que aparece no log e no trecho fornecido.`;

  let user = `LOG DE ERRO DO PDFLATEX (parte relevante):\n\`\`\`\n${logTrecho}\n\`\`\``;

  if (linhaErro) {
    user += `\nLinha do erro reportada pelo LaTeX: ${linhaErro}`;
  }
  if (arquivoErro) {
    user += ` (arquivo: ${arquivoErro})`;
  }

  if (texContexto) {
    user += `\n\nTRECHO DO ARQUIVO .tex PRÓXIMO À LINHA DO ERRO (a linha marcada com >>> é a que o LaTeX apontou):\n\`\`\`latex\n${texContexto}\n\`\`\``;
  }

  user += '\n\nAgora explique o erro e sugira a correção no formato pedido.';

  return { system, user };
}

async function detectarBackendComPreferencia() {
  if (groqDisponivel()) {
    try {
      return { backend: 'groq', chamar: chamarGroq };
    } catch {
      // fall through
    }
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

function extrairCorrecao(resposta) {
  if (!resposta) return { original: null, replacement: null };

  const novo = resposta.match(/<<<correction>>>\s*\n?original:\s*([\s\S]*?)\n\s*replacement:\s*([\s\S]*?)\n?\s*<<<\/?correction>>/i);
  if (novo) {
    return {
      original: novo[1].trim(),
      replacement: novo[2].trim(),
    };
  }

  const bloco = resposta.match(/```(?:latex|tex)?\s*\n([\s\S]*?)```/);
  if (bloco) return { original: null, replacement: bloco[1].trim() };

  return { original: null, replacement: null };
}

function ehRateLimit(err) {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return msg.includes('rate') || msg.includes('429') || msg.includes('limit');
}

export async function explainLatexError({ log, texContexto, linhaErro, arquivoErro }) {
  const { trecho, linhaErro: linhaExtraida, arquivoErro: arquivoExtraido } = extrairParteRelevante(log);

  const linhaFinal = linhaErro || linhaExtraida || null;
  const arquivoFinal = arquivoErro || arquivoExtraido || null;

  const { system, user } = montarPrompt({
    logTrecho: trecho,
    linhaErro: linhaFinal,
    arquivoErro: arquivoFinal,
    texContexto,
  });

  let backend;
  let resposta;
  let usouFallback = false;

  try {
    backend = await detectarBackendComPreferencia();
  } catch (err) {
    throw err;
  }

  try {
    resposta = await backend.chamar(system, user, 0.2);
  } catch (err) {
    if (backend.backend === 'groq' && ehRateLimit(err)) {
      if (await ollamaDisponivel()) {
        backend = { backend: 'ollama', chamar: chamarOllama };
        resposta = await backend.chamar(system, user, 0.2);
        usouFallback = true;
      } else {
        throw new Error('Limite de requisições do Groq atingido e Ollama não está disponível localmente.');
      }
    } else {
      throw err;
    }
  }

  const { original: trecho_original, replacement: trecho_corrigido_sugerido } = extrairCorrecao(resposta);

  return {
    explicacao: resposta,
    trecho_corrigido_sugerido,
    trecho_original,
    linhaErro: linhaFinal,
    arquivoErro: arquivoFinal,
    backend_usado: usouFallback ? `ollama (fallback de groq)` : backend.backend,
  };
}
