# Importar Projetos

O TexLab permite importar projetos LaTeX existentes de diferentes fontes.

## Importar Pasta

1. Clique em **"Novo Projeto"** → **"Importar pasta"**
2. Selecione a pasta que contém seus arquivos `.tex`
3. Escolha um nome para o projeto
4. Clique em **"Importar projeto"**

!!! tip "Dica"
    Certifique-se de que sua pasta contém um arquivo `.tex` principal com `\documentclass` ou `\begin{document}`.

## Importar Arquivo .zip

1. Clique em **"Novo Projeto"** → **"Importar arquivo .zip"**
2. Selecione o arquivo `.zip` com seu projeto
3. Escolha um nome para o projeto
4. Clique em **"Importar projeto"`

!!! warning "Atenção"
    O tamanho máximo do arquivo `.zip` é de 100MB.

## Estrutura Esperada

Ao importar, o TexLab espera uma estrutura típica de projeto LaTeX:

```
meu-projeto/
├── main.tex          # Arquivo principal
├── references.bib    # Bibliografia (opcional)
├── chapters/         # Capítulos (opcional)
│   ├── intro.tex
│   └── metodologia.tex
└── figures/          # Figuras (opcional)
    └── diagrama.png
```

## Diferenças entre Importar e Clonar

| Método | Uso indicado |
|---|---|
| **Importar pasta** | Arquivos locais no computador |
| **Importar .zip** | Arquivo compactado baixado de algum lugar |
| **Clonar do GitHub** | Repositório hospedado no GitHub |
