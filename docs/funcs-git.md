# Funcionalidades Git

O TexLab possui integração completa com Git, permitindo gerenciar versionamento diretamente pelo editor. Todas as funcionalidades ficam acessíveis pelo **botão Git** na barra de ferramentas superior.

!!! info "Pré-requisito"
    Para usar, o projeto precisa ter um repositório inicializado. Se ainda não tiver, veja [Inicializar Git](#inicializar-git). A autenticação usa as chaves SSH do seu sistema (veja [Configuração Git](config-git.md)).

---

## Botão Git na toolbar

Ao lado do nome do projeto na barra de ferramentas, há um botão **`⎇ main`** com a branch atual. À direita, dois contadores:

- **`↓N`** (pull) — quantos commits o remote tem à frente da sua branch
- **`↑N`** (push) — quantos commits você tem à frente do remote

Clicar em qualquer um dos contadores dispara a operação correspondente. Se houver alterações não commitadas, um modal pergunta se você quer fazer commit antes.

Clicar no nome da branch abre o **painel Source Control** (popover ancorado) com:

- **Header**: nome da branch + clique para abrir o submenu de branches
- **Caixa de commit**: textarea + botão "Commitar" (Ctrl+Enter)
- **Conflitos** (se houver): lista de arquivos com conflito — clique abre no editor
- **Alterações**: lista de arquivos modificados — clique abre o diff
- **Histórico**: últimos commits com hash curto, autor, tempo relativo e mensagem — clique abre o diff daquele commit

---

## Inicializar Git

Se o projeto não tem repositório:

1. Clique no botão **"Git"** na toolbar
2. No modal, preencha (opcional):
    - **URL do remoto** — use SSH: `git@github.com:usuario/repo.git` ou `ssh://...`
    - **Seu nome** — autor dos commits (pré-preenchido do `git config --global` se existir)
    - **Seu e-mail** — idem
3. Clique em **"Inicializar"**

Por baixo dos panos:

```
git init
git config user.name "<seu nome>"     # se preenchido
git config user.email "<seu email>"   # se preenchido
# cria .gitignore LaTeX se não existir
git remote add origin <url>           # se preenchida
git add . && git commit -m "Initial commit"   # se há arquivos
```

!!! tip "`.gitignore` LaTeX padrão"
    É criado automaticamente (se não existir) com:
    `*.aux *.log *.out *.toc *.synctex.gz *.fls *.fdb_latexmk *.bbl *.bcf *.run.xml *.nav *.snm`
    O `*.pdf` **não** é ignorado — comum em projetos LaTeX acadêmicos (Overleaf, abnTeX2).

---

## Commitar Alterações

1. Abra o painel Git (clique no nome da branch na toolbar)
2. Digite a **mensagem do commit** na caixa
3. Pressione **Ctrl+Enter** ou clique em **"Commitar"**

Equivale a `git add . && git commit -m "<msg>"`.

---

## Push / Pull

### Push
Clique no contador **`↑N`** ao lado do nome da branch, ou abra o painel e clique em "Push" no submenu de branches.

### Pull
Clique no contador **`↓N`** ou abra "Pull" no submenu.

!!! warning "Working tree sujo"
    Se houver alterações não commitadas, o TexLab pergunta se você quer fazer commit antes. **Não há auto-resolve**: você precisa resolver tudo manualmente (veja [Conflitos](#conflitos)).

---

## Diff

### Diff de arquivo
- Clique em um arquivo na lista **"Alterações"** do painel — abre o **Monaco Diff Editor** comparando o arquivo no working tree vs `HEAD`
- Arquivos não rastreados (novos) mostram o conteúdo inteiro como "added"

### Diff de commit
- Clique em um item do **Histórico** — abre o Monaco Diff Editor mostrando aquele commit

O Monaco Diff Editor é o mesmo do VS Code: side-by-side, com destaque de adições/remoções.

---

## Branches

Abra o painel Git e clique no nome da branch para entrar no **submenu de branches**.

- **Listar**: locais + remotas (com badge "remota" para as que não existem localmente)
- **Criar**: clique em "Nova branch" e digite o nome
- **Trocar (checkout)**: clique em uma branch
    - Se houver alterações não commitadas, o checkout é **recusado** com erro `DIRTY_WORKING_TREE` — faça commit ou descarte antes
    - Se houver conflitos de merge não resolvidos, o checkout também é recusado
- **Fetch**: clique em "Buscar" para atualizar a lista de branches remotas

---

## Merge

1. No submenu de branches, clique em **"Merge"**
2. Digite o nome da branch de origem (ex: `feature-x` ou `origin/feature-x`)
3. Clique em "Mesclar"

- **Sem conflito**: cria commit de merge automaticamente
- **Com conflito**: o merge para e os arquivos vão para o estado `unmerged`. Veja [Conflitos](#conflitos).

---

## Conflitos

O TexLab **não resolve conflitos automaticamente**. O fluxo é:

1. Após `pull` ou `merge` com conflito, o backend retorna `409` com `conflictFiles: [...]`
2. O painel Git mostra uma seção **"Conflitos (N)"** no topo
3. **Clique em um arquivo** da lista de conflitos — o arquivo abre no editor principal com os marcadores `<<<<<<<` / `=======` / `>>>>>>>` destacados pelo mesmo padrão de marcadores usado pelo LanguageTool
4. **Edite o arquivo** no editor principal: escolha uma versão ou combine as duas; remova os marcadores
5. À medida que você apaga os marcadores, o destaque some automaticamente
6. Quando **todos** os arquivos conflitantes perdem os marcadores, a seção "Conflitos" do painel some
7. **Faça commit** da resolução — o commit substitui o estado de merge

O estado do working tree permanece sujo durante todo o processo até você commitar.

---

## Erros amigáveis

Mensagens comuns do Git são traduzidas para PT-BR com orientação:

| Mensagem do Git | O que o TexLab mostra |
|---|---|
| `Permission denied (publickey)` | "Falha de autenticação SSH. Verifique se sua chave privada está em `~/.ssh/` com permissão 600 e se foi adicionada ao repositório remoto. Teste com `ssh -T git@github.com`." |
| `Repository not found` | "Repositório não encontrado. Verifique se a URL está correta." |
| `Please tell me who you are` | "Configure seu nome e e-mail antes de commitar. Preencha os campos no modal de inicialização, ou rode `git config --global user.name/email`." |
| `failed to push some refs` | "Push rejeitado: o remote tem commits que você não tem localmente. Faça pull primeiro." |
| `Your local changes would be overwritten` | "Suas alterações locais seriam sobrescritas. Faça commit ou descarte antes de continuar." |
| `nothing to commit` | "Nada para commitar." |
| URL inválida (não-SSH) | "URL inválida. Use SSH (ex: `git@github.com:usuario/repo.git`)." |

---

## Resumo Rápido

| Ação | Como |
|---|---|
| Inicializar Git | Botão "Git" na toolbar → modal |
| Commit | Painel Git → textarea + "Commitar" (Ctrl+Enter) |
| Push | Contador `↑N` na toolbar OU "Push" no submenu |
| Pull | Contador `↓N` na toolbar OU "Pull" no submenu |
| Merge | Submenu de branches → "Merge" |
| Trocar branch | Submenu de branches → clique na branch |
| Criar branch | Submenu de branches → "Nova branch" |
| Ver diff de arquivo | Painel → "Alterações" → clique no arquivo |
| Ver diff de commit | Painel → "Histórico" → clique no commit |
| Resolver conflito | Painel → "Conflitos" → clique no arquivo → editar no editor |
