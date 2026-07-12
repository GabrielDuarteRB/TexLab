# Revisão Ortográfica em Tempo Real

O TexLab verifica a ortografia e a gramática do seu texto LaTeX **enquanto você digita**, sem precisar clicar em "Revisar". A integração usa o [LanguageTool](https://languagetool.org/) (via servidor `ltex-ls-plus`) em **português brasileiro**.

---

## Visão Geral

Ao abrir um arquivo `.tex` ou `.bib`, o editor dispara uma checagem inicial. A cada edição, o conteúdo é reenviado para o servidor após **800 ms de inatividade** (debounce) e os erros encontrados aparecem instantaneamente como **sublinhado ondulado** (squiggly) sob o trecho com problema.

Você pode:

- **Ver o erro** passando o mouse sobre o trecho marcado
- **Aplicar a correção automaticamente** clicando no ícone de **lightbulb (💡)** que aparece na linha
- **Desativar a checagem** pelo painel IA (ver [Como Usar](#como-usar))

---

## Como Usar

### Indicator no canto inferior direito do editor

O pequeno badge no canto inferior direito do editor mostra o estado atual da checagem:

| Aparência | Texto | Significado |
|---|---|---|
| ✓ ícone de check | `Verificação ortográfica` | Checagem ativa, ocioso |
| ↻ spinner | `Verificando...` | Checagem em andamento (aguarde ~1 s) |
| ✕ ícone riscado | `ltex indisponível` | O servidor LSP está offline — abra um terminal e veja [Solução de Problemas](#solucao-de-problemas) |

### Ligar e desligar

A checagem vem **ligada por padrão**. Para desligar (ou religar):

1. Abra o **Painel IA** clicando no botão `IA` na toolbar superior
2. Vá na aba **"Revisar"**
3. Marque/desmarque a caixa **"Checagem ortográfica em tempo real"**

Quando desligada, os marcadores existentes são removidos na próxima edição.

### Aplicar uma sugestão

1. Posicione o cursor sobre a palavra com squiggly
2. Clique no ícone 💡 (ou use `Ctrl + .`) para abrir o menu de sugestões
3. Escolha a substituição — o trecho é substituído na hora

!!! tip "Sugestões só no clique"
    Na checagem em tempo real, o backend **não** busca sugestões para todos os marcadores (seria lento). As sugestões são buscadas **sob demanda** quando você clica no 💡. Para ter marcadores já com sugestões visíveis, use o botão **"Revisar Texto Completo"** no painel IA — esse caminho é mais lento, mas completo.

---

## O que é Checado

O LTEX+ analisa o texto humano (e ignora comandos LaTeX). Tipos de problemas detectados em pt-BR:

- **Ortografia** — palavras escritas erradas ou inexistentes
- **Gramática** — concordância nominal/verbal, regência, crase
- **Pontuação** — vírgulas, pontos, aspas
- **Repetições próximas** — mesmas palavras em sequência

### O que o LTEX **ignora** propositalmente

| Categoria | Exemplo |
|---|---|
| Comandos LaTeX | `\section`, `\cite{...}`, `\label{...}` |
| Equações | `$x^2 + y^2 = z^2$`, `$$...$$` |
| Figuras e tabelas | `\includegraphics{...}`, `\caption{...}` |
| URLs e paths | `https://...`, `\input{...}` |
| Texto dentro de comentários | `% comentário` |

Isso evita falsos positivos em código LaTeX.

---

## Configuração

### Idioma

O idioma é fixo em **pt-BR** por padrão. Para mudar, edite duas constantes em `backend/src/services/ltex/ltexClient.js`:

```js
// 1. No handshake inicial
initializationOptions: { ltex: { language: 'pt-BR' } }

// 2. Na resposta de workspace/configuration
return params.items.map(() => ({
  language: 'pt-BR',
  enabled: true,
  checkFrequency: 'edit',
}));
```

E o parâmetro de idioma no hook de tempo real (`frontend/src/hooks/useRealtimeSpellCheck.js`).

### Debounce

Para deixar a checagem mais (ou menos) responsiva, ajuste `DEBOUNCE_MS` em `frontend/src/hooks/useRealtimeSpellCheck.js`:

```js
const DEBOUNCE_MS = 800; // tempo de espera após a última tecla
```

| Valor | Comportamento |
|---|---|
| `300` | Quase instantâneo, mais requisições ao backend |
| `800` | Padrão — bom equilíbrio entre responsividade e carga |
| `1500+` | Conservador, ideal para documentos muito grandes |

### Desabilitar globalmente

Além do toggle no painel IA (por sessão), você pode impedir a inicialização do servidor LSP comentando o serviço `ltex-ls` em `docker-compose.yml`.

---

## Solução de Problemas

| Problema | Causa | Solução |
|----------|-------|---------|
| Indicator mostra `ltex indisponível` | Container `ltex-ls` não está rodando | `docker compose up -d ltex-ls` |
| Marcadores não aparecem mesmo com indicator OK | Backend não consegue alcançar o LSP | Verifique `LTEX_HOST=ltex-ls` e `LTEX_PORT=2222` em `docker-compose.yml` |
| Checagem muito lenta em documento grande | Pool serializado + muitos diagnósticos | Aumente `DEBOUNCE_MS` para 1500+ ou desligue o toggle temporariamente |
| Marcadores somem ao editar | Comportamento esperado (debounce) | Aguarde 800 ms — reaparecem automaticamente |
| Lightbulb não mostra sugestões | O backend só busca sugestões sob demanda no realtime | Use **"Revisar Texto Completo"** no painel IA para ver todas as sugestões |
| Sugestão troca texto errado | Bug de offset do LSP | Reporte com o trecho e o documento; o cálculo de offset usa UTF-16 (igual ao Monaco) |

!!! note "Detalhes técnicos"
    Para a referência técnica completa (arquitetura, endpoints REST, configuração de pool, troubleshooting avançado), veja [Funcionalidades IA → Seção 9](ai-features.md#9-revisao-ortografica-em-tempo-real-ltex).
