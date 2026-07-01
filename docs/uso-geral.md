# Uso Geral

## Tela Inicial

A tela inicial mostra todos os seus projetos. De lá você pode:

- **Criar um novo projeto** — clique em "Novo Projeto"
- **Abrir um projeto** — clique no card do projeto
- **Renomear** — clique no ícone de lápis no card
- **Excluir** — clique no ícone de lixeira no card

## Criar Projeto

Clique em "Novo Projeto" e escolha uma das opções:

| Opção | Descrição |
|---|---|
| Criar do zero | Comece com um projeto LaTeX em branco |
| Importar pasta | Selecione uma pasta com arquivos LaTeX |
| Importar .zip | Importe um projeto compactado |
| Clonar do GitHub | Clone um repositório GitHub |

## Editor

O editor usa o Monaco Editor (mesmo do VS Code) com syntax highlight para LaTeX.

### Barra de Ferramentas (topo)

| Botão | Função |
|---|---|
| **Salvar** | Salva o arquivo atual e compila automaticamente |
| **Compilar** | Compila o projeto sem salvar |
| **Baixar PDF** | Baixa o PDF gerado |
| **IA** | Abrir/fechar o assistente IA (em desenvolvimento) |

### Barra Lateral (esquerda)

- Árvore de arquivos do projeto
- Criar arquivo, criar pasta, fazer upload
- Arrastar e soltar para reorganizar
- Clique com botão direito para renomear/excluir

### Área Principal

- Editor de código à esquerda
- PDF compilado à direita
- Navegação por seções (outline) no canto do PDF

## Compilar e Baixar PDF

1. Clique em **"Compilar"** na barra de ferramentas
2. O PDF é gerado automaticamente e aparece no painel à direita
3. Clique em **"Baixar PDF"** para salvar no seu computador

!!! note "Erro de compilação"
    Se houver erro, um painel de erro aparece no topo com detalhes do problema.

## Atalhos do Editor

O editor Monaco oferece os mesmos atalhos do VS Code:

| Atalho | Função |
|---|---|
| `Ctrl + S` | Salvar |
| `Ctrl + Z` | Desfazer |
| `Ctrl + Y` | Refazer |
| `Ctrl + /` | Comentar/descomentar linha |
| `Ctrl + D` | Selecionar próxima ocorrência |
| `Ctrl + F` | Buscar no arquivo |
| `Ctrl + H` | Buscar e substituir |
