# Instalação

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) (geralmente já vem com o Docker Desktop)

## Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/overleaf-local.git
cd overleaf-local
```

### 2. Crie o arquivo `.env`

```bash
cp .env.example .env
```

### 3. Personalize (opcional)

Edite o arquivo `.env` conforme necessário:

```env
PORT=3001
PROJECTS_DIR=./projects

# Git (opcional) — só precisa configurar se os arquivos não estão no padrão
# GITCONFIG_PATH=~/.gitconfig
# SSH_DIR_PATH=~/.ssh

# IA (opcional)
# AI_API_KEY=sua-chave-aqui
# AI_PROVIDER=openai
```

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do backend | `3001` |
| `PROJECTS_DIR` | Pasta onde os projetos são salvos | `./projects` |
| `GITCONFIG_PATH` | Caminho para `.gitconfig` | `~/.gitconfig` |
| `SSH_DIR_PATH` | Caminho para pasta SSH | `~/.ssh` |
| `AI_API_KEY` | Chave da API de IA (opcional) | vazio |
| `AI_PROVIDER` | Provedor de IA (`openai` ou `anthropic`) | `openai` |

## Subindo o sistema

```bash
docker-compose up --build
```

Os projetos ficam salvos na pasta `./projects` do repositório.

## URLs de acesso

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |

## Parando o sistema

```bash
docker-compose down
```

## Reconstruindo

Se houver alterações no código, reconstrua os containers:

```bash
docker-compose up --build
```
