import { ollamaDisponivel, chamarOllamaChat } from './academic/ollamaClient.js';
import { groqDisponivel, chamarGroqChat } from './academic/groqClient.js';

const HISTORY_LIMIT = 20;
const DOC_CONTEXT_MAX_CHARS = 8000;

const SYSTEM_PROMPT = `Você é um assistente especializado em LaTeX, ajudando um escritor/pesquisador brasileiro a tirar dúvidas sobre sintaxe, pacotes, formatação e boas práticas.

REGRAS:
1. Responda SEMPRE em português do Brasil (PT-BR).
2. Seja direto — evite introduções longas antes de mostrar a solução. Vá direto ao ponto.
3. Quando a resposta envolver código LaTeX, mostre o trecho pronto para copiar em um bloco de código markdown \`\`\`latex ... \`\`\`.
4. IMPORTANTE: não invente nomes de pacotes ou comandos. Se não tiver certeza da existência de um pacote específico, diga explicitamente ("não tenho certeza se esse pacote existe") em vez de sugerir um nome plausível-mas-inventado. Pacotes LaTeX têm nomes muito específicos e inventar nomes é um risco real.
5. Se a pergunta for ambígua, faça uma pergunta de esclarecimento curta antes de tentar responder.
6. Se o usuário incluiu o conteúdo do documento dele (indicado por uma mensagem marcada como contexto), USE esse contexto para dar respostas mais precisas — referencie trechos específicos do código dele quando útil.`;

function ehRateLimit(err) {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return msg.includes('rate') || msg.includes('429') || msg.includes('limit');
}

function sanitizarHistorico(historico) {
  if (!Array.isArray(historico)) return [];
  return historico
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }));
}

export function montarMensagens({ pergunta, historico, contextoDocumento, includeContext }) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  if (includeContext && contextoDocumento && typeof contextoDocumento === 'string' && contextoDocumento.trim()) {
    const ctx = contextoDocumento.length > DOC_CONTEXT_MAX_CHARS
      ? `${contextoDocumento.slice(0, DOC_CONTEXT_MAX_CHARS)}\n\n... (truncado)`
      : contextoDocumento;
    messages.push({
      role: 'user',
      content: `[Contexto do documento do usuário]\n\n${ctx}`,
    });
    messages.push({
      role: 'assistant',
      content: 'Entendi. Vou usar o conteúdo do documento como contexto para responder suas perguntas.',
    });
  }

  const hist = sanitizarHistorico(historico).slice(-HISTORY_LIMIT);
  for (const m of hist) messages.push(m);

  messages.push({ role: 'user', content: pergunta });

  return messages;
}

async function detectarBackendComPreferencia() {
  if (groqDisponivel()) {
    try {
      return { backend: 'groq', chamar: chamarGroqChat };
    } catch {}
  }
  if (await ollamaDisponivel()) {
    return { backend: 'ollama', chamar: chamarOllamaChat };
  }
  if (groqDisponivel()) {
    return { backend: 'groq', chamar: chamarGroqChat };
  }
  throw new Error(
    'Nenhum backend de IA disponível. Instale Ollama (ollama.com) ' +
    'ou configure GROQ_API_KEY no .env'
  );
}

export async function chatLatex({ pergunta, historico, contextoDocumento, includeContext }) {
  const messages = montarMensagens({ pergunta, historico, contextoDocumento, includeContext });

  let backend;
  let resposta;
  let usouFallback = false;

  try {
    backend = await detectarBackendComPreferencia();
  } catch (err) {
    throw err;
  }

  try {
    resposta = await backend.chamar(messages, 0.4);
  } catch (err) {
    if (backend.backend === 'groq' && ehRateLimit(err)) {
      if (await ollamaDisponivel()) {
        backend = { backend: 'ollama', chamar: chamarOllamaChat };
        resposta = await backend.chamar(messages, 0.4);
        usouFallback = true;
      } else {
        throw new Error('Limite de requisições do Groq atingido e Ollama não está disponível localmente.');
      }
    } else {
      throw err;
    }
  }

  return {
    resposta,
    backend_usado: usouFallback ? `ollama (fallback de groq)` : backend.backend,
  };
}
