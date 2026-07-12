# TexLab

**Editor LaTeX local inspirado no Overleaf, com React + Express + Docker.**

---

## Visão Geral

O TexLab é uma ferramenta para escrever, compilar e visualizar documentos LaTeX diretamente no seu computador. Ele funciona de forma similar ao Overleaf, mas rodando 100% local.

### Funcionalidades

- Editor Monaco com syntax highlight para LaTeX
- Compilação automática via TexLive (pdflatex/latexmk)
- Visualização de PDF lado a lado
- Gerenciamento de projetos e arquivos
- Importar projetos de pastas, .zip ou GitHub
- **Revisão ortográfica em tempo real** com LanguageTool (pt-BR)
- Assistente IA para revisão acadêmica (Ollama local ou Groq cloud)

### Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, Vite, Monaco Editor, Zustand |
| Backend | Node.js, Express |
| Compilação | TexLive (latexmk) |
| Infra | Docker Compose |

---

## Início Rápido

```bash
# Copiar configuração
cp .env.example .env

# Subir com Docker
docker-compose up --build
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api

---

## Documentação

| Seção | Descrição |
|---|---|
| [Instalação](instalacao.md) | Pré-requisitos, configuração e execução |
| [Uso Geral](uso-geral.md) | Como usar o editor e compilar documentos |
| [Revisão Ortográfica](revisao-ortografica.md) | Checagem ortográfica/gramatical em tempo real |
| [Funcionalidades IA](ai-features.md) | Revisão acadêmica via Ollama/Groq e detalhes técnicos |
| [Importar Projetos](importar.md) | Importar de pastas ou arquivos .zip |
| [Clonar do GitHub](clone-github.md) | Clonar repositórios públicos e privados |
| [Configuração Git](config-git.md) | Configurar credenciais e caminhos |
