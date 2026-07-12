# TexLab

Editor LaTeX local inspirado no Overleaf, com React + Express + Docker.

## Início Rápido

```bash
# Copiar configuração
cp .env.example .env

# Subir com Docker (detecta GPU automaticamente)
chmod +x docker.sh
./docker.sh
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api

## Funcionalidades

- Editor Monaco com syntax highlight para LaTeX
- Compilação LaTeX via TexLive (pdflatex/latexmk)
- Visualização de PDF lado a lado
- Gerenciamento de projetos e arquivos
- Importar de pastas, .zip ou GitHub
- **Revisão ortográfica em tempo real** com LanguageTool (pt-BR)
- **Explicação de erros de compilação** com IA: clique em "Explicar erro" no painel de log para receber diagnóstico em PT-BR
- IA opcional para revisão acadêmica (configurar `GROQ_API_KEY` ou Ollama no `.env`)

## Documentação

A documentação completa está na pasta [`docs/`](docs/), disponível também via GitHub Pages.

| Seção | Descrição |
|---|---|
| [Instalação](docs/instalacao.md) | Pré-requisitos, configuração e execução |
| [Uso Geral](docs/uso-geral.md) | Como usar o editor e compilar documentos |
| [Revisão Ortográfica](docs/revisao-ortografica.md) | Checagem ortográfica/gramatical em tempo real |
| [Funcionalidades IA](docs/ai-features.md) | Revisão acadêmica via Ollama/Groq e detalhes técnicos |
| [Importar Projetos](docs/importar.md) | Importar de pastas ou arquivos .zip |
| [Clonar do GitHub](docs/clone-github.md) | Clonar repositórios públicos e privados |
| [Configuração Git](docs/config-git.md) | Configurar credenciais e caminhos |

### Publicando a documentação

```bash
pip install mkdocs-material
mkdocs gh-deploy
```

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, Vite, Monaco Editor, Zustand |
| Backend | Node.js, Express |
| Compilação | TexLive (latexmk) |
| Infra | Docker Compose |
