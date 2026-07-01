# Clonar do GitHub

Esta funcionalidade permite clonar um repositório GitHub diretamente para um projeto local no TexLab.

## Repositórios Públicos

1. Clique em **"Novo Projeto"** → **"Clonar do GitHub"**
2. Cole a URL do repositório:

    ```
    https://github.com/usuario/repositorio
    ```

3. Clique em **"Continuar"**
4. O nome do projeto é extraído automaticamente da URL (você pode editar)
5. Clique em **"Clonar projeto"**

## Repositórios Privados

Para repositórios privados, o TexLab usa suas credenciais SSH já configuradas no computador.

1. Certifique-se de ter uma chave SSH configurada (veja [Configuração Git](config-git.md))
2. Siga os mesmos passos acima — o sistema detecta suas credenciais automaticamente

!!! info "Autenticação"
    O TexLab herda as credenciais SSH do seu computador via Docker. Se você consegue fazer `git clone` no terminal, também vai funcionar no TexLab.

## Encontrando Suas Chaves SSH

Se você nunca configurou SSH, provavelmente não tem chaves. Para verificar:

### No Linux/Mac (terminal)

```bash
ls -la ~/.ssh/
```

Procurar por arquivos como:

- `id_rsa` / `id_rsa.pub` (chave RSA)
- `id_ed25519` / `id_ed25519.pub` (chave Ed25519, mais moderna)

### Criando uma chave SSH

Se não encontrar nenhum arquivo, crie uma:

```bash
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
```

Depois adicione a chave pública ao GitHub:

1. Copie o conteúdo de `~/.ssh/id_ed25519.pub`
2. Vá em **GitHub** → **Settings** → **SSH and GPG keys** → **New SSH key**
3. Cole a chave e salve

### No Windows (PowerShell)

```powershell
dir ~\.ssh\
```

Ou acesse a pasta `C:\Users\SeuUsuario\.ssh\` pelo explorador de arquivos.

## Manter Histórico Git

Ao clonar, existe um checkbox **"Manter histórico Git (.git)"**:

| Opção | Comportamento |
|---|---|
| **Marcado** | O histórico de commits do repositório é preservado no projeto |
| **Desmarcado** (padrão) | Apenas os arquivos são importados, sem histórico Git |

!!! warning "Atenção"
    Manter o histórico Git aumenta o tamanho do projeto e pode causar conflitos se você editar os arquivos localmente.
