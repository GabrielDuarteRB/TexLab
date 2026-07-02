# Funcionalidades de IA

O TexLab possui dois sistemas de IA independentes para auxiliar na escrita acadêmica:

| Sistema | Tipo | Backend | Uso |
|---------|------|---------|-----|
| **Academic Review** | Local (Ollama) | GPU do seu computador | Revisão de textos acadêmicos |
| **Academic Review** | Cloud (Groq) | API Groq (servidores remotos) | Revisão de textos acadêmicos |
| **AI Suggest** | Cloud (OpenAI/Anthropic) | API | Assistência livre para LaTeX |

### Ollama vs Groq: Qual usar?

| Aspecto | Ollama (Local) | Groq (Cloud) |
|---------|----------------|--------------|
| **Onde roda** | No seu computador | Servidores da Groq |
| **Depende de** | GPU/RAM do seu PC | Conexão com internet |
| **Custo** | Gratuito | Free tier: 14.400 req/dia |
| **Velocidade** | Depende do hardware | Muito rápido (LPU) |
| **Privacidade** | Dados nunca saem do PC | Dados vão para nuvem |
| **Modelos** | qwen2.5:7b, llama3.1, etc. | llama-3.3-70b-versatile, etc. |

**Recomendação:** Use **Ollama** se tiver GPU boa (8GB+ VRAM). Use **Groq** se não tiver GPU ou quiser mais velocidade.

---

## 1. Arquitetura

### Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │  AiPanel.jsx                                    │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐     │    │
│  │  │ Revisar   │ │ Repetição │ │ Sugerir   │     │    │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘     │    │
│  └────────┼──────────────┼──────────────┼───────────┘    │
│           │              │              │                │
└───────────┼──────────────┼──────────────┼────────────────┘
            │              │              │
    POST /api/ai/review   │      POST /api/ai/suggest
            │              │              │
┌───────────┼──────────────┼──────────────┼────────────────┐
│  Backend (Node.js)       │              │                │
│  ┌───────▼────────┐     │       ┌──────▼───────┐       │
│  │ academicReview │     │       │  aiService   │       │
│  │   Service.js   │     │       │    .js       │       │
│  └───────┬────────┘     │       └──────┬───────┘       │
│          │              │              │                │
│  ┌───────▼────────┐     │       ┌──────▼───────┐       │
│  │  ollamaClient  │     │       │  OpenAI ou   │       │
│  │  groqClient    │     │       │  Anthropic   │       │
│  └───────┬────────┘     │       └──────────────┘       │
│          │              │                               │
│  ┌───────▼──────────────▼───┐                           │
│  │  localRepetitionDetector │                           │
│  └──────────────────────────┘                           │
└──────────┬──────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│  Docker                                                 │
│  ┌──────────────┐                                       │
│  │   Ollama     │  ← GPU NVIDIA (qwen2.5:7b)           │
│  │  :11435      │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de uma Revisão Acadêmica

1. Usuário clica em "Revisar Texto Completo" no painel IA
2. Backend recebe texto + idioma (`POST /api/ai/review`)
3. LaTeX é parseado (equações, figuras, citações são removidos)
4. Texto é dividido em chunks (~2048 tokens cada)
5. Chunks são processados em paralelo (máx. 3 simultâneos)
6. Cada chunk é enviado ao LLM com prompt de revisão
7. Detector local de repetições é executado em paralelo
8. Resultados do LLM e do detector local são mesclados e deduplicados
9. Resposta JSON é retornada ao frontend
10. Frontend exibe correções com diff visual, repetições e sugestões

---

## 2. Academic Review (Ollama / Groq)

### O que faz

Revisão automática de textos acadêmicos com:

- **Correções gramaticais** — ortografia, pontuação, concordância, regência
- **Detecção de repetições** — palavras repetidas com sugestões de sinônimos
- **Variações de reescrita** — alternativas com diferentes níveis de formalidade
- **Sugestões de melhoria** — melhorias contextuais para o texto
- **Parsing de LaTeX** — ignora equações, figuras, citações, comandos

### Pipeline

```
Texto LaTeX/PT ou EN
       │
       ▼
┌──────────────┐
│ parseLatex() │  Remove equações, tikz, figuras, citações
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ chunkText()  │  Divide em chunks de ~2048 tokens
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ processarEmParalelo │  Envia chunks ao LLM (máx. 3 simultâneos)
└──────┬──────────────┘
       │
       ├──────────────────────────┐
       │                          │
       ▼                          ▼
┌──────────────┐      ┌─────────────────────────┐
│  LLM Output  │      │ detectarRepeticoesLocais│
│  (por chunk) │      │  (texto completo)       │
└──────┬───────┘      └──────────┬──────────────┘
       │                         │
       ▼                         ▼
┌──────────────────────────────────────┐
│         deduplicarPalavras()         │
│  Mescla LLM + detector local        │
└──────────────────┬───────────────────┘
                   │
                   ▼
            Resposta JSON
```

### Backend Detection

O sistema tenta backends nesta ordem (modo automático):

1. **Ollama** (preferido) — Verifica disponibilidade via `/api/tags`
2. **Groq** (fallback) — Verifica se `GROQ_API_KEY` existe
3. **Erro** — Nenhum backend disponível

O usuário também pode **escolher manualmente** o backend no painel IA (dropdown "Backend").

### Detecção de Repetições

Dois mecanismos trabalham juntos:

| Mecanismo | Escopo | Vantagem |
|-----------|--------|----------|
| LLM | Por chunk | Contexto semântico |
| Detector local | Texto completo | Visão global, lematização |

O detector local:
- Lematiza palavras (regras para PT e EN)
- Filtra stopwords
- Conta frequência por lemma
- Fornece sinônimos acadêmicos de um dicionário hardcoded
- Marca resultados com `fonte: "local"` para diferenciação

### Processamento Paralelo

```javascript
const CONCORRENCIA_MAX = 3;  // Chunks simultâneos
```

- Fila de chunks com processamento assíncrono
- Máximo 3 requests ao LLM ao mesmo tempo
- 3 retries por chunk em caso de falha de parsing JSON

---

## 3. AI Suggest (OpenAI / Anthropic)

### O que faz

Assistência de IA livre para conteúdo LaTeX:

- Escrever novo conteúdo
- Corrigir trechos específicos
- Melhorar redação
- Qualquer instrução do usuário

### Configuração

| Variável | Valores | Modelo padrão |
|----------|---------|---------------|
| `AI_PROVIDER` | `openai` ou `anthropic` | `openai` |
| `AI_API_KEY` | Chave da API | — |

**Modelos utilizados:**
- OpenAI: `gpt-4o`
- Anthropic: `claude-sonnet-4-20250514`

---

## 4. Configuração

### Pré-requisitos

| Componente | Obrigatório? | Como instalar |
|------------|-------------|---------------|
| Docker + Docker Compose | Sim | [docs.docker.com](https://docs.docker.com/compose/install/) |
| GPU NVIDIA | Recomendado | Driver NVIDIA instalado no host |
| NVIDIA Container Toolkit | Se usar GPU | `sudo apt install nvidia-container-toolkit` |

### Variáveis de Ambiente

#### Backend (em `docker-compose.yml`)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `OLLAMA_BASE_URL` | `http://ollama:11434` | URL do Ollama (Docker network) |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Modelo Ollama para revisão |
| `GROQ_API_KEY` | — | Chave API Groq (obrigatório para usar Groq) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Modelo Groq para revisão |
| `AI_API_KEY` | — | Chave OpenAI/Anthropic (para Suggest) |
| `AI_PROVIDER` | `openai` | Provedor para Suggest |

#### Ollama (em `docker-compose.yml`)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `OLLAMA_NUM_PARALLEL` | `3` | Requests simultâneos |
| `OLLAMA_KEEP_ALIVE` | `10m` | Tempo para manter modelo carregado |
| `OLLAMA_FLASH_ATTENTION` | `1` | Otimização de memória |

### Como configurar o Groq

1. **Criar conta gratuita** em [console.groq.com](https://console.groq.com) (sem cartão de crédito)
2. **Gerar API Key** em API Keys → Create API Key
3. **Adicionar no arquivo `.env`** na raiz do projeto:

```bash
GROQ_API_KEY=gsk_sua_chave_aqui
```

4. **Reiniciar o backend:**

```bash
docker compose restart backend
```

5. **Verificar se funcionou:**

```bash
curl http://localhost:3001/api/ai/academic-status
```

Resposta esperada:

```json
{
  "ollama_disponivel": true,
  "groq_disponivel": true,
  "disponivel": true
}
```

### docker-compose.yml

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11435:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_FLASH_ATTENTION=1
      - OLLAMA_NUM_PARALLEL=3
      - OLLAMA_KEEP_ALIVE=10m
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - OLLAMA_MODEL=qwen2.5:7b
      - GROQ_API_KEY=${GROQ_API_KEY:-}
      - GROQ_MODEL=llama-3.3-70b-versatile
    depends_on:
      - ollama
    volumes:
      - ./projects:/app/projects
    restart: unless-stopped
```

### Modelos Suportados

#### Ollama (Local — roda no seu computador)

| Modelo | Tamanho | VRAM | Velocidade | Qualidade |
|--------|---------|------|------------|-----------|
| `qwen2.5:7b` | 4.7GB | ~5GB | ⚡ Rápido | ✅ Boa |
| `qwen2.5:14b` | 8.5GB | ~10GB | 🐌 Lento* | ✅ Ótima |
| `llama3.1:8b` | 4.7GB | ~5GB | ⚡ Rápido | ✅ Boa |

*qwen2.5:14b pode dividir processamento entre CPU/GPU em GPUs com 8GB VRAM.

**Recomendação:** `qwen2.5:7b` para GPUs com 8GB VRAM (100% GPU).

#### Groq (Cloud — roda na nuvem, sem precisar de GPU)

| Modelo | Plataforma | Velocidade | Qualidade |
|--------|------------|------------|-----------|
| `llama-3.3-70b-versatile` | Groq (API) | ⚡ Muito rápido | ✅ Excelente |

**Vantagem do Groq:** Não depende de hardware local. Funciona em qualquer computador com internet.

> **Atenção:** Modelos podem ser descontinuados ou substituídos pela plataforma. Verifique sempre a documentação oficial do Groq para confirmar se o modelo está disponível: [console.groq.com/docs/models](https://console.groq.com/docs/models)

### Instalação do NVIDIA Container Toolkit

```bash
# Adicionar repositório
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Instalar
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configurar Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### Pull do Modelo

```bash
# Acessar container Ollama
docker exec -it overleaf-local-ollama-1 ollama pull qwen2.5:7b

# Remover modelo antigo (opcional)
docker exec -it overleaf-local-ollama-1 ollama rm llama3.1:8b
```

---

## 5. API REST

Base URL: `http://localhost:3001/api`

### POST /api/ai/review

Revisão acadêmica de texto.

**Request:**

```json
{
  "text": "Seu texto acadêmico aqui...",
  "idioma": "pt",
  "backend": "auto"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `text` | string | Sim | Texto para revisar |
| `idioma` | string | Não | `pt` (padrão) ou `en` |
| `backend` | string | Não | `auto` (padrão), `ollama` ou `groq` |

**Response:**

```json
{
  "texto_corrigido": "Texto revisado...",
  "correcoes": [
    {
      "original": "O metodo utilizado foi",
      "corrigido": "O método utilizado foi",
      "explicacao": "Acentuação ortográfica: 'método' leva acento"
    }
  ],
  "variacoes": [
    "A abordagem empregada consistiu em..."
  ],
  "palavras_repetidas": [
    {
      "palavra": "método",
      "lema": "metodo",
      "ocorrencias": 5,
      "paragrafos": [0, 2, 4],
      "sugestoes": ["abordagem", "procedimento", "técnica"],
      "fonte": "llm"
    }
  ],
  "sugestoes_melhoria": [
    "Considere adicionar uma transição entre os parágrafos..."
  ],
  "erros": [],
  "total_chunks": 3,
  "chunks_processados": 3,
  "backend_usado": "ollama"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `texto_corrigido` | string | Texto completo revisado |
| `correcoes` | array | Lista de correções com diff |
| `variacoes` | array | Alternativas de reescrita |
| `palavras_repetidas` | array | Palavras repetidas com sinônimos |
| `sugestoes_melhoria` | array | Sugestões de melhoria |
| `erros` | array | Índices de chunks com erro |
| `total_chunks` | number | Total de chunks processados |
| `chunks_processados` | number | Chunks com sucesso |
| `backend_usado` | string | `ollama` ou `groq` |

### POST /api/ai/suggest

Assistência LaTeX com IA.

**Request:**

```json
{
  "latexContent": "\\begin{document}\n...",
  "instruction": "Adicione uma seção sobre metodologia"
}
```

**Response:**

```json
{
  "success": true,
  "suggestion": "\\section{Metodologia}\n\\label{sec:metodo}\n..."
}
```

### GET /api/ai/status

Verifica se AI Suggest está disponível.

**Response:**

```json
{
  "enabled": true
}
```

### GET /api/ai/academic-status

Verifica status dos backends acadêmicos.

**Response:**

```json
{
  "ollama_disponivel": true,
  "groq_disponivel": false,
  "disponivel": true
}
```

---

## 6. Frontend

### Painel IA

O painel é aberto pelo botão **"IA"** (ícone Sparkles) na toolbar.

**Largura:** 380px | **Posição:** Direita

### Abas

#### 1. Revisar

- Seleção de idioma (PT/EN)
- Botão "Revisar Texto Completo"
- Exibe:
  - **Correções** — Lista com diff visual (vermelho = removido, verde = adicionado)
  - **Variações** — Alternativas de reescrita
  - **Sugestões** — Melhorias sugeridas

#### 2. Repetição

- Lista de palavras repetidas
- Para cada palavra:
  - Ocorrências (ex: `5x`)
  - Parágrafos onde aparece (ex: `§0, §2, §4`)
  - Sinônimos acadêmicos sugeridos

#### 3. Sugerir

- Campo de texto livre para instruções
- Botão "Enviar"
- Resposta da IA exibida abaixo

### Visualização de Diffs

As correções são exibidas com estilo visual:

```css
.ai-diff-removed {
  color: #ef4444;        /* vermelho */
  text-decoration: line-through;
  background: #fef2f2;
}

.ai-diff-added {
  color: #22c55e;        /* verde */
  background: #f0fdf4;
}
```

**Exemplo:**

~~O metodo~~ → **O método**

---

## 7. Inventário de Arquivos

### Backend — Serviços de IA

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/services/academic/academicReviewService.js` | Orquestrador principal: parsing, chunking, LLM, deduplicação |
| `backend/src/services/academic/ollamaClient.js` | Cliente Ollama (health check + chat) |
| `backend/src/services/academic/groqClient.js` | Cliente Groq (API OpenAI-compatível) |
| `backend/src/services/academic/promptBuilder.js` | System prompts PT/EN + parsing JSON |
| `backend/src/services/academic/chunker.js` | Divisão de texto em chunks |
| `backend/src/services/academic/localRepetitionDetector.js` | Detector local com lematização |
| `backend/src/services/aiService.js` | Cliente OpenAI/Anthropic (Suggest) |

### Backend — Rotas e Controllers

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/routes/aiRoutes.js` | Definição das rotas `/api/ai/*` |
| `backend/src/controllers/aiController.js` | Handlers das rotas |
| `backend/src/config/index.js` | Configuração de env vars |

### Frontend

| Arquivo | Descrição |
|---------|-----------|
| `frontend/src/components/ai/AiPanel.jsx` | Painel de IA (3 abas) |
| `frontend/src/hooks/useAi.js` | Hook React para estado da IA |
| `frontend/src/services/api.js` | Cliente HTTP para endpoints |
| `frontend/src/styles/global.css` | Estilos CSS do painel IA |
| `frontend/src/components/toolbar/Toolbar.jsx` | Botão "IA" na toolbar |
| `frontend/src/components/layout/AppLayout.jsx` | Integração do painel no layout |

### Docker / Config

| Arquivo | Descrição |
|---------|-----------|
| `docker-compose.yml` | Serviços Ollama, backend, frontend |
| `backend/Dockerfile` | Build do backend (TeX Live + Node.js) |
| `frontend/Dockerfile` | Build do frontend (Node.js + Vite) |
| `.env` | Variáveis de ambiente |

---

## 8. Solução de Problemas

| Problema | Causa | Solução |
|----------|-------|---------|
| "Nenhum backend disponível" | Ollama e Groq indisponíveis | Verificar se Ollama está rodando: `docker ps` |
| Groq: "model decommissioned" | Modelo descontinuado | Verificar `GROQ_MODEL` em `docker-compose.yml` |
| Groq: "invalid_api_key" | Chave inválida ou ausente | Verificar `GROQ_API_KEY` no `.env` |
| Resposta muito lenta | Modelo grande ou sem GPU | Usar `qwen2.5:7b` com GPU ou Groq |
| Erro de parsing JSON | LLM retornou formato inválido | Sistema faz retry automáticos (3x) |
| GPU não utilizada | NVIDIA Container Toolkit ausente | Instalar toolkit e reiniciar Docker |
| Modelo não encontrado | Modelo não baixado | `docker exec ollama ollama pull qwen2.5:7b` |
| Repetições não aparecem | Texto muito curto ou sem repetições | Funciona melhor com textos > 500 palavras |
