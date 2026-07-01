# Funcionalidades Git

O TexLab possui integração completa com Git, permitindo gerenciar versionamento diretamente pelo editor. Todas as funcionalidades Git ficam acessíveis pelo **botão Git** na barra de ferramentas superior.

!!! info "Pré-requisito"
    Para usar as funcionalidades Git, o projeto precisa ter um repositório inicializado. Se ainda não tiver, veja a seção [Inicializar Git](#inicializar-git) abaixo ou a página [Clonar do GitHub](clone-github.md).

---

## Status do Repositório

Ao abrir um projeto com Git, o TexLab exibe na barra de ferramentas:

- **Nome da branch atual** — ex: `main`, `feature/novo-sumario`
- **Indicador de alterações pendentes** — quantidade de arquivos modificados não commitados (ex: "3 alterações")

O status é atualizado automaticamente após cada operação Git (commit, checkout, push, etc.).

---

## Gerenciamento de Branches

Clique no botão Git na barra de ferramentas para abrir o dropdown de branches.

### Listar Branches

O dropdown mostra duas seções:

| Seção | Descrição |
|---|---|
| **Branches locais** | Branches existentes no repositório local |
| **Branches remotas** | Branches disponíveis no repositório remoto (GitHub) que ainda não existem localmente |

- A branch atual aparece com um ícone de ✓ e não é clicável
- Branches remotas exibem um badge "remota"

### Criar Nova Branch

1. Clique em **"Nova Branch"** (ícone de +) no dropdown
2. Digite o nome da branch no campo que aparece
3. Pressione **Enter** ou clique em **"Criar"**
4. A nova branch é criada a partir da branch atual

!!! note
    Criar uma branch não muda automaticamente para ela. Use o checkout para trocar.

### Trocar de Branch (Checkout)

1. Clique no nome de uma branch diferente na lista
2. **Se não houver alterações pendentes**, a troca é feita imediatamente
3. **Se houver alterações pendentes**, um modal de aviso aparece com duas opções:

| Opção | O que acontece |
|---|---|
| **Manter alterações** | As alterações são salvas em stash, a branch é trocada, e as alterações são restauradas. Se houver conflitos, o modal de resolução de conflitos é aberto. |
| **Zerar branch** | Todas as alterações locais são descartadas e a branch é trocada forçadamente |

### Resolução de Conflitos

Se ao trocar de branch com "Manter alterações" houver conflitos entre suas alterações e a branch de destino, o **modal de conflitos** é exibido.

O modal mostra uma lista de arquivos em conflito. Para resolver:

1. **Clique em um arquivo** para expandi-lo
2. O conteúdo do arquivo é carregado com os marcadores de conflito do Git:
    ```
    <<<<<<< HEAD
    conteúdo da branch de destino
    =======
    suas alterações
    >>>>>>> stash@{0}
    ```
3. **Edite o conteúdo** no textarea, removendo os marcadores e escolhendo quais alterações manter
4. Clique em **"Resolver"** para salvar
5. Repita para todos os arquivos em conflito
6. Quando todos estiverem resolvidos, clique em **"Concluir"**

!!! tip
    Cada arquivo pode ter múltiplas regiões de conflito. O badge ao lado do nome do arquivo indica quantos conflitos existem.

---

## Commitar Alterações

1. Clique em **"Commitar"** no dropdown Git (ícone de check)
2. Digite uma **mensagem descrevendo** a alteração
3. Clique em **"Commitar"** ou pressione **Enter**

O que acontece por baixo dos panos:

```
git add .
git commit -sua mensagem
```

!!! warning "Boas práticas"
    - Use mensagens descritivas e concisas
    - Exemplos boas: "Adiciona sumário automático", "Corrige formatação da bibliografia"
    - Evite mensagens vagas como "atualização" ou "fix"

---

## Enviar para o Remoto (Push)

1. Clique em **"Push"** no dropdown Git (ícone de upload)
2. A branch atual é enviada para o repositório remoto (origin)

!!! warning "Requisitos"
    - O projeto precisa ter um repositório remoto configurado
    - Suas credenciais SSH ou HTTPS precisam estar configuradas
    - Veja [Configuração Git](config-git.md) para mais detalhes

---

## Buscar Branches Remotas (Fetch)

1. Clique em **"Buscar branches remotas"** no dropdown Git (ícone de refresh)
2. O TexLab busca as atualizações do repositório remoto

Isso atualiza a lista de branches disponíveis, incluindo branches que foram criadas por outros colaboradores no GitHub.

!!! info "Quando usar"
    Use o fetch antes de trocar de branch para garantir que você tenha a versão mais recente das branches remotas.

---

## Visualizar Alterações (Diff)

1. Clique em **"Ver alterações"** no dropdown Git (ícone de lupa)
2. Um modal abre mostrando a lista de arquivos modificados

Cada arquivo é分类ado por tipo de alteração:

| Tipo | Cor | Descrição |
|---|---|---|
| **Adicionado** | Verde | Arquivo novo, ainda não commitado |
| **Modificado** | Amarelo | Arquivo existente que foi alterado |
| **Excluído** | Vermelho | Arquivo que foi removido |
| **Não rastreado** | Cinza | Arquivo novo que ainda não foi adicionado ao Git |
| **Renomeado** | Azul | Arquivo que teve o nome alterado |

### Ver Diff de um Arquivo

Clique em um arquivo na lista para expandir e ver as alterações específicas:

- **Linhas verdes** (`+`) — conteúdo adicionado
- **Linhas vermelhas** (`-`) — conteúdo removido
- **Linhas cinzas** — contexto (sem alteração)

Clique novamente para recolher.

---

## Inicializar Git

Se o projeto não tiver um repositório Git:

1. O modal **"Inicializar Git"** aparece automaticamente ou pode ser acessado pelo dropdown
2. Opcionalmente, insira a **URL do repositório remoto** (ex: `https://github.com/usuario/repo.git`)
3. Clique em **"Confirmar"**

O que acontece:

```
git init
git remote add origin <sua-url>    # se informada
git add .
git commit -m "Initial commit"
```

!!! tip
    Se você já tem um repositório no GitHub, é mais rápido usar a opção **"Clonar do GitHub"** na tela inicial. Veja [Clonar do GitHub](clone-github.md).

---

## Resumo Rápido

| Funcionalidade | Botão | O que faz |
|---|---|---|
| Ver status | — | Exibe branch atual e alterações pendentes |
| Listar branches | Dropdown Git | Mostra branches locais e remotas |
| Criar branch | + no dropdown | Cria nova branch a partir da atual |
| Trocar branch | Clique na branch | Faz checkout (com ou sem stash) |
| Commitar | Check no dropdown | `git add .` + `git commit` |
| Push | Upload no dropdown | `git push -u origin <branch>` |
| Fetch | Refresh no dropdown | `git fetch origin` |
| Ver diff | Lupa no dropdown | Lista de arquivos alterados com diff inline |
| Resolver conflitos | Automático | Modal com textarea para edição manual |
| Inicializar Git | Modal de init | `git init` + commit inicial |
