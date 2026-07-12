/**
 * LSP Protocol - Framing Content-Length + JSON-RPC 2.0 over TCP
 *
 * O protocolo LSP usa o Content-Length framing do LSP 3.15:
 *   Content-Length: <n>\r\n
 *   \r\n
 *   <JSON-RPC 2.0 payload>
 *
 * Este módulo implementa:
 * - Serialização de mensagens (request, response, notification)
 * - Parsing de mensagens recebidas com buffer de recepção
 * - Fila de requests pendentes com correlation ID
 */

import { EventEmitter } from 'events';

let nextId = 1;

/**
 * Cria uma conexão LSP sobre um socket TCP.
 * Retorna um objeto com métodos para enviar mensagens e receber respostas.
 *
 * @param {import('net').Socket} socket - Socket TCP conectado ao servidor LSP
 * @returns {LspConnection}
 */
export function createLspConnection(socket) {
  const emitter = new EventEmitter();
  const pending = new Map(); // id -> { resolve, reject, timer }
  const requestHandlers = new Map(); // method -> handler(params) => result
  let buffer = Buffer.alloc(0);
  let closed = false;

  // Serializa e envia uma mensagem LSP (Content-Length framing)
  function send(message) {
    if (closed) throw new Error('Connection already closed');
    const json = JSON.stringify(message);
    const body = Buffer.from(json, 'utf-8');
    const header = `Content-Length: ${body.length}\r\n\r\n`;
    socket.write(header + json);
  }

  // Envia uma request JSON-RPC 2.0 e retorna Promise da response
  function request(method, params, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`LSP request "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });

      send({ jsonrpc: '2.0', id, method, params });
    });
  }

  // Envia uma notification JSON-RPC 2.0 (sem id, sem resposta esperada)
  function notify(method, params) {
    send({ jsonrpc: '2.0', method, params });
  }

  // Processa dados recebidos do socket (pode vir em pedaços)
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    processBuffer();
  });

  socket.on('error', (err) => {
    emitter.emit('error', err);
    // Rejeitar todas as requests pendentes
    for (const [id, { reject, timer }] of pending) {
      clearTimeout(timer);
      reject(new Error(`Connection error: ${err.message}`));
    }
    pending.clear();
  });

  socket.on('close', () => {
    closed = true;
    emitter.emit('close');
    // Rejeitar requests pendentes
    for (const [id, { reject, timer }] of pending) {
      clearTimeout(timer);
      reject(new Error('Connection closed'));
    }
    pending.clear();
  });

  // Processa o buffer acumulado, extraindo mensagens LSP completas
  function processBuffer() {
    while (true) {
      // Procura o separador de headers \r\n\r\n
      const headerEnd = findHeaderEnd(buffer);
      if (headerEnd === -1) return; // Header incompleto, aguarda mais dados

      // Extrai e parseia o header Content-Length
      const headerStr = buffer.slice(0, headerEnd).toString('utf-8');
      const match = headerStr.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // Header inválido, descarta até o próximo \r\n\r\n
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4; // pula o \r\n\r\n
      const totalNeeded = bodyStart + contentLength;

      if (buffer.length < totalNeeded) return; // Corpo incompleto, aguarda mais dados

      // Extrai e parseia o corpo JSON
      const bodyStr = buffer.slice(bodyStart, totalNeeded).toString('utf-8');
      buffer = buffer.slice(totalNeeded); // Remove a mensagem processada

      try {
        const message = JSON.parse(bodyStr);
        dispatch(message);
      } catch (err) {
        emitter.emit('error', new Error(`Failed to parse LSP message: ${err.message}`));
      }
    }
  }

  // Encontra o offset do fim do header (\r\n\r\n)
  function findHeaderEnd(buf) {
    for (let i = 0; i < buf.length - 3; i++) {
      if (buf[i] === 0x0d && buf[i + 1] === 0x0a && buf[i + 2] === 0x0d && buf[i + 3] === 0x0a) {
        return i;
      }
    }
    return -1;
  }

  // Despacha uma mensagem LSP recebida para o handler correto
  function dispatch(message) {
    // Response (tem campo "id" e "result" ou "error")
    if ('id' in message && (message.result !== undefined || message.error)) {
      const pendingReq = pending.get(message.id);
      if (pendingReq) {
        clearTimeout(pendingReq.timer);
        pending.delete(message.id);
        if (message.error) {
          pendingReq.reject(new Error(`LSP error ${message.error.code}: ${message.error.message}`));
        } else {
          pendingReq.resolve(message.result);
        }
      }
      return;
    }

    // Notification (tem campo "method" mas não "id")
    if ('method' in message && !('id' in message)) {
      emitter.emit('notification', message.method, message.params);
      emitter.emit(`notification:${message.method}`, message.params);
      return;
    }

    // Request do servidor (tem "id" e "method")
    // Verifica se há um handler registrado para este método
    if ('id' in message && 'method' in message) {
      const handler = requestHandlers.get(message.method);
      if (handler) {
        try {
          const result = handler(message.params);
          if (result && typeof result.then === 'function') {
            result.then(
              r => send({ jsonrpc: '2.0', id: message.id, result: r }),
              () => send({ jsonrpc: '2.0', id: message.id, result: null }),
            );
          } else {
            send({ jsonrpc: '2.0', id: message.id, result: result ?? null });
          }
        } catch {
          send({ jsonrpc: '2.0', id: message.id, result: null });
        }
      } else {
        // Sem handler registrado — responde com null
        send({ jsonrpc: '2.0', id: message.id, result: null });
      }
    }
  }

  function close() {
    closed = true;
    for (const [id, { timer }] of pending) {
      clearTimeout(timer);
    }
    pending.clear();
    socket.destroy();
  }

  return {
    send,
    request,
    notify,
    close,
    /** Registra handler para requests do servidor (ex: workspace/configuration) */
    onRequest(method, handler) {
      requestHandlers.set(method, handler);
    },
    get closed() { return closed; },
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    removeListener: emitter.removeListener.bind(emitter),
  };
}
