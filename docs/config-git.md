# Configuração Git

O TexLab pode usar os arquivos de configuração Git do seu computador para autenticação em repositórios privados.

## Variáveis de Ambiente

No arquivo `.env`, você pode definir os caminhos para os arquivos Git:

```env
GITCONFIG_PATH=~/.gitconfig
SSH_DIR_PATH=~/.ssh
```

Se não definido, os valores padrão são usados.

## Encontrando Seus Arquivos

### Localizações Padrão

| Sistema | Arquivo | Localização padrão |
|---|---|---|
| Linux | `.gitconfig` | `~/.gitconfig` |
| Linux | SSH | `~/.ssh/` |
| Mac | `.gitconfig` | `~/.gitconfig` |
| Mac | SSH | `~/.ssh/` |
| Windows | `.gitconfig` | `C:\Users\SeuUsuario\.gitconfig` |
| Windows | SSH | `C:\Users\SeuUsuario\.ssh\` |

### Encontrando o Caminho Exato

No terminal, use os seguintes comandos:

```bash
# Caminho do gitconfig
git config --global --list

# Caminho do SSH
ssh -G git.github.com 2>&1 | head -1
```

## Como Funciona

O Docker Compose monta os seguintes volumes no container do backend:

| Volume | Descrição |
|---|---|
| `~/.gitconfig:/root/.gitconfig:ro` | Configuração Git (somente leitura) |
| `~/.ssh:/root/.ssh:ro` | Chaves SSH (somente leitura) |

Isso permite que o container use as mesmas credenciais do seu computador.

!!! note "Somente leitura"
    Os arquivos são montados como somente leitura (`:ro`) para evitar alterações acidentais na sua configuração Git.

## Solução de Problemas

### Erro de autenticação ao clonar

1. Verifique se sua chave SSH está configurada:

    ```bash
    ssh -T git@github.com
    ```

2. Se receber "The authenticity of host...", adicione o GitHub às known_hosts:

    ```bash
    ssh-keyscan github.com >> ~/.ssh/known_hosts
    ```

### Chave SSH não encontrada pelo container

1. Verifique se o arquivo existe:

    ```bash
    ls -la ~/.ssh/
    ```

2. Verifique as permissões:

    ```bash
    chmod 600 ~/.ssh/id_ed25519
    chmod 644 ~/.ssh/id_ed25519.pub
    ```

### Git config não encontrado

1. Verifique o caminho:

    ```bash
    git config --global --list
    ```

2. Se o arquivo não existir, crie:

    ```bash
    git config --global user.name "Seu Nome"
    git config --global user.email "seu@email.com"
    ```
