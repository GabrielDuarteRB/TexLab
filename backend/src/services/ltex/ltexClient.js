/**
 * LTEX+ Client - Cliente LSP mínimo para checagem de texto LaTeX
 *
 * Mantém um pool de conexões TCP persistentes com o ltex-ls-plus.
 * Cada chamada de checkDocument():
 *   1. Pega uma conexão do pool
 *   2. Envia textDocument/didOpen com o conteúdo LaTeX
 *   3. Aguarda textDocument/publishDiagnostics
 *   4. Converte os diagnósticos para o formato { startOffset, endOffset, message, suggestions }
 *   5. Envia textDocument/didClose
 *   6. Retorna a conexão ao pool
 *
 * Reconexão automática: se uma conexão cair, o pool cria uma nova.
 */

import * as net from 'net';
import { createLspConnection } from './lspProtocol.js';

const LTEX_HOST = process.env.LTEX_HOST || 'localhost';
const LTEX_PORT = parseInt(process.env.LTEX_PORT || '2222', 10);
const LTEX_TIMEOUT_MS = parseInt(process.env.LTEX_TIMEOUT_MS || '30000', 10);
// ltex-ls-plus em tcpSocket aceita apenas UMA conexão por vez; manter >1
// faz a 2ª chamada paralela travar no SO até estourar o timeout do handshake.
const POOL_SIZE = parseInt(process.env.LTEX_POOL_SIZE || '1', 10);

/**
 * @typedef {Object} LtexDiagnostic
 * @property {number} startOffset - Offset byte do início do trecho com erro (0-indexed)
 * @property {number} endOffset   - Offset byte do fim do trecho com erro
 * @property {string} message     - Mensagem descritiva do erro
 * @property {string[]} suggestions - Sugestões de correção (pode ser vazio)
 */

/**
 * Cria e inicializa uma conexão TCP com o ltex-ls-plus.
 * Retorna a conexão LSP já com handshake feito.
 *
 * @param {number} timeoutMs - Timeout para o handshake initialize
 * @returns {Promise<import('./lspProtocol.js').LspConnection>}
 */
async function createConnection(timeoutMs = LTEX_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: LTEX_HOST, port: LTEX_PORT }, () => {
      const conn = createLspConnection(socket);

      // Registra handler para workspace/configuration
      // O ltex-ls manda esta request para obter configurações do workspace
      // Precisa retornar o objeto ltex com o idioma configurado
      conn.onRequest('workspace/configuration', (params) => {
        if (params && Array.isArray(params.items)) {
          return params.items.map(() => ({
            language: 'pt-BR',
            enabled: true,
            checkFrequency: 'edit',
          }));
        }
        return [{ language: 'pt-BR', enabled: true }];
      });

      // Handshake LSP: initialize -> initialized -> didChangeConfiguration
      conn.request('initialize', {
        processId: process.pid,
        rootUri: 'file:///workspace',
        capabilities: {
          textDocument: {
            publishDiagnostics: {
              relatedInformation: false,
            },
          },
        },
        // Configurações ltex: idioma pt-BR
        initializationOptions: {
          ltex: {
            language: 'pt-BR',
          },
        },
      }, timeoutMs)
        .then((result) => {
          // Envia notification "initialized" (confirma handshake)
          conn.notify('initialized', {});

          // Envia configuração do workspace para o ltex-ls
          // O servidor precisa desta notificação para saber o idioma e outras configurações
          conn.notify('workspace/didChangeConfiguration', {
            settings: {
              ltex: {
                language: 'pt-BR',
                enabled: true,
                checkFrequency: 'edit',
              },
            },
          });

          resolve(conn);
        })
        .catch((err) => {
          conn.close();
          reject(err);
        });
    });

    socket.on('error', (err) => {
      reject(new Error(`Failed to connect to ltex-ls at ${LTEX_HOST}:${LTEX_PORT}: ${err.message}`));
    });

    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error(`Connection to ltex-ls timed out after ${timeoutMs}ms`));
    });
  });
}

/**
 * Pool de conexões LSP persistentes.
 *
 * Cada entrada do pool é:
 *   { conn: LspConnection, busy: boolean, useCount: number }
 *
 * Quando uma conexão morre, ela é removida e recriada sob demanda.
 */
class ConnectionPool {
  constructor(poolSize = POOL_SIZE) {
    this.poolSize = poolSize;
    /** @type {Array<{conn: any, busy: boolean, useCount: number}>} */
    this.connections = [];
    this._creating = false;
  }

  /**
   * Obtém uma conexão livre do pool. Cria nova se necessário.
   * @returns {Promise<any>} conexão LSP inicializada
   */
  async acquire() {
    // Tenta reutilizar conexão existente não-busca
    for (const entry of this.connections) {
      if (!entry.busy && !entry.conn.closed) {
        entry.busy = true;
        entry.useCount++;
        return entry.conn;
      }
    }

    // Remove conexões mortas
    this.connections = this.connections.filter(e => !e.conn.closed);

    // Se pool não está cheio, cria nova conexão
    if (this.connections.length < this.poolSize) {
      // Evita thundering herd: only one connection creation at a time
      if (!this._creating) {
        this._creating = true;
        try {
          const conn = await createConnection();
          const entry = { conn, busy: true, useCount: 1 };
          this.connections.push(entry);
          return conn;
        } finally {
          this._creating = false;
        }
      }
      // Se outra thread está criando, espera um pouco e tenta de novo
      await new Promise(r => setTimeout(r, 100));
      return this.acquire();
    }

    // Pool cheio — espera uma conexão ficar livre (polling simples)
    await new Promise(r => setTimeout(r, 50));
    return this.acquire();
  }

  /**
   * Retorna uma conexão ao pool (marca como não-busca).
   * @param {any} conn
   */
  release(conn) {
    for (const entry of this.connections) {
      if (entry.conn === conn) {
        entry.busy = false;
        return;
      }
    }
  }

  /**
   * Remove uma conexão do pool (quando morreu).
   * @param {any} conn
   */
  remove(conn) {
    this.connections = this.connections.filter(e => e.conn !== conn);
  }

  /**
   * Fecha todas as conexões.
   */
  async closeAll() {
    for (const entry of this.connections) {
      try {
        entry.conn.close();
      } catch {}
    }
    this.connections = [];
  }

  /**
   * Status do pool.
   */
  get status() {
    return {
      total: this.connections.length,
      busy: this.connections.filter(e => e.busy).length,
      idle: this.connections.filter(e => !e.busy).length,
      closed: this.connections.filter(e => e.conn.closed).length,
      host: LTEX_HOST,
      port: LTEX_PORT,
    };
  }
}

// Pool global singleton
const pool = new ConnectionPool();

/**
 * Gera um URI pseudo-aleatório para o documento.
 * Cada chamada usa um URI diferente para evitar conflitos no servidor.
 */
let docCounter = 0;
function generateUri() {
  docCounter++;
  return `untitled:latex-check-${docCounter}-${Date.now()}.tex`;
}

/**
 * Verifica um texto LaTeX via ltex-ls-plus.
 *
 * @param {string} text - Conteúdo LaTeX bruto para checar
 * @param {Object} [options]
 * @param {string} [options.languageId='latex'] - Language ID (latex, bibtex, etc.)
 * @param {string} [options.language='pt-BR'] - Código de idioma BCP 47
 * @param {number} [options.timeoutMs] - Timeout em ms (override)
 * @param {boolean} [options.includeSuggestions=true] - Se false, pula o
 *   codeAction por diagnóstico (mais rápido, útil para checagem em tempo
 *   real). Sugestões só fazem sentido no fluxo on-demand (botão Revisar).
 * @returns {Promise<LtexDiagnostic[]>} Array de diagnósticos
 */
export async function checkDocument(text, options = {}) {
  const {
    languageId = 'latex',
    language = 'pt-BR',
    timeoutMs = LTEX_TIMEOUT_MS,
    includeSuggestions = true,
  } = options;

  const conn = await pool.acquire();
  const uri = generateUri();
  let callFailed = false;

  try {
    // Abre o documento no servidor LSP
    // O servidor vai processar o LaTeX, extrair texto, checar com LanguageTool
    // e enviar de volta um textDocument/publishDiagnostics
    const diagnostics = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        conn.removeListener('notification:textDocument/publishDiagnostics', handler);
        reject(new Error(`ltex checkDocument timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      function handler(params) {
        // Filtra apenas diagnósticos deste documento
        if (params.uri === uri) {
          clearTimeout(timer);
          conn.removeListener('notification:textDocument/publishDiagnostics', handler);
          resolve(params.diagnostics || []);
        }
      }

      conn.on('notification:textDocument/publishDiagnostics', handler);

      // Envia didOpen com o conteúdo do documento
      conn.notify('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId,
          version: 1,
          text,
        },
      });
    });

    // Converte diagnósticos LSP para o formato solicitado
    const results = [];
    for (const d of diagnostics) {
      const suggestions = includeSuggestions
        ? await getSuggestions(conn, uri, d, timeoutMs)
        : [];
      results.push(convertDiagnostic(d, text, suggestions));
    }
    return results;
  } catch (err) {
    callFailed = true;
    throw err;
  } finally {
    // Fecha o documento no servidor
    try {
      conn.notify('textDocument/didClose', {
        textDocument: { uri },
      });
    } catch {}

    // Se a chamada falhou OU o socket foi fechado pelo servidor, descarta
    // a conexão: ela pode estar em estado inconsistente e a próxima
    // chamada precisa de uma fresca.
    if (callFailed || conn.closed) {
      pool.remove(conn);
      try { conn.close(); } catch {}
    } else {
      pool.release(conn);
    }
  }
}

/**
 * Busca sugestões de correção via textDocument/codeAction request.
 * O ltex-ls-plus não envia sugestões em publishDiagnostics — é preciso
 * fazer uma request codeAction para cada diagnóstico.
 *
 * @param {any} conn - Conexão LSP
 * @param {string} uri - URI do documento
 * @param {Object} diagnostic - Diagnóstico LSP
 * @param {number} timeoutMs - Timeout
 * @returns {Promise<string[]>} Array de sugestões
 */
async function getSuggestions(conn, uri, diagnostic, timeoutMs) {
  try {
    const actions = await conn.request('textDocument/codeAction', {
      textDocument: { uri },
      range: diagnostic.range,
      context: {
        diagnostics: [diagnostic],
        only: ['quickfix'],
      },
    }, timeoutMs);

    if (!Array.isArray(actions)) return [];

    const suggestions = [];
    for (const action of actions) {
      // CodeAction com edit (substituição direta)
      if (action.edit) {
        extractTextFromWorkspaceEdit(action.edit, suggestions);
      }
      // CodeAction com command (ex: _ltex.acceptSuggestions)
      if (action.command && action.command.arguments) {
        for (const arg of action.command.arguments) {
          if (typeof arg === 'string') {
            suggestions.push(arg);
          } else if (arg && typeof arg === 'object') {
            if (typeof arg.replacements === 'string') suggestions.push(arg.replacements);
            else if (Array.isArray(arg.replacements)) {
              for (const r of arg.replacements) {
                if (typeof r === 'string') suggestions.push(r);
              }
            }
            if (typeof arg.suggestion === 'string') suggestions.push(arg.suggestion);
          }
        }
      }
      // O título do CodeAction às vezes é a própria sugestão
      if (!action.edit && !action.command && action.title && action.title !== 'Add to dictionary') {
        if (!suggestions.includes(action.title)) suggestions.push(action.title);
      }
    }

    // Remove duplicatas preservando ordem
    return [...new Set(suggestions)];
  } catch {
    return [];
  }
}

/**
 * Extrai texto de substituição de um WorkspaceEdit.
 */
function extractTextFromWorkspaceEdit(edit, suggestions) {
  if (!edit) return;
  // Formato documentChanges
  if (Array.isArray(edit.documentChanges)) {
    for (const change of edit.documentChanges) {
      if (change.edits) {
        for (const e of change.edits) {
          if (e.newText) suggestions.push(e.newText);
          else if (e.text) suggestions.push(e.text);
        }
      }
    }
  }
  // Formato changes (mapa uri -> edits)
  if (edit.changes) {
    for (const uri in edit.changes) {
      for (const e of edit.changes[uri]) {
        if (e.newText) suggestions.push(e.newText);
        else if (e.text) suggestions.push(e.text);
      }
    }
  }
}

/**
 * Converte um diagnóstico LSP para o formato do projeto.
 *
 * Diagnósticos LSP usam Range com line/character (0-indexed).
 * Convertemos para **índice de caractere** (não byte offset) no texto original,
 * compatível com String.prototype.slice() e com o Monaco editor.
 *
 * @param {Object} diagnostic - Diagnóstico LSP (com range, message)
 * @param {string} originalText - Texto original para calcular offsets
 * @param {string[]} suggestions - Sugestões obtidas via codeAction
 * @returns {LtexDiagnostic}
 */
function convertDiagnostic(diagnostic, originalText, suggestions = []) {
  const lines = originalText.split('\n');

  // Calcula índice de caractere (0-indexed) a partir de line/character do LSP.
  // LSP usa UTF-16 code units, então character=10 significa 10 code units a partir do início da linha.
  // JavaScript String também usa UTF-16 code units como índice, então a conversão é direta.
  function lineCharToCharIndex(line, character) {
    let index = 0;
    for (let i = 0; i < line && i < lines.length; i++) {
      // +1 para o \n
      index += lines[i].length + 1;
    }
    if (line >= lines.length) return index;
    // JavaScript String índice = UTF-16 code unit index, igual ao LSP
    return index + character;
  }

  const startOffset = lineCharToCharIndex(
    diagnostic.range.start.line,
    diagnostic.range.start.character,
  );
  const endOffset = lineCharToCharIndex(
    diagnostic.range.end.line,
    diagnostic.range.end.character,
  );

  return {
    startOffset,
    endOffset,
    message: diagnostic.message || '',
    suggestions,
  };
}

/**
 * Verifica a conectividade com o ltex-ls-plus.
 * Tenta fazer o handshake initialize/initialized.
 *
 * @returns {Promise<{available: boolean, version?: string, error?: string}>}
 */
export async function checkHealth() {
  try {
    const conn = await createConnection(5000);
    const result = await conn.request('initialize', {
      processId: process.pid,
      rootUri: null,
      capabilities: {},
    }, 5000);
    conn.notify('initialized', {});
    conn.close();
    return {
      available: true,
      version: result?.serverInfo?.version || 'unknown',
    };
  } catch (err) {
    return {
      available: false,
      error: err.message,
    };
  }
}

/**
 * Retorna status do pool de conexões.
 */
export function getPoolStatus() {
  return pool.status;
}

/**
 * Fecha todas as conexões do pool.
 */
export async function shutdown() {
  await pool.closeAll();
}
