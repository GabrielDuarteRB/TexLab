# TexLab

Editor LaTeX local inspirado no Overleaf, com React + Express + Docker.

## Início Rápido

```bash
# Copiar configuração
cp .env.example .env

# Subir com Docker
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

## Funcionalidades

- Editor Monaco com syntax highlight para LaTeX
- Compilação LaTeX via TexLive (pdflatex/latexmk)
- Visualização de PDF lado a lado
- Gerenciamento de projetos e arquivos
- IA opcional para sugestões (configurar `AI_API_KEY` no `.env`)

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, Vite, Monaco Editor, Zustand |
| Backend | Node.js, Express |
| Compilação | TexLive (latexmk) |
| Infra | Docker Compose |
