let registered = false;

export function registerLatexLanguage(monaco) {
  if (registered) return;
  registered = true;

  monaco.languages.register({
    id: 'latex',
    extensions: ['.tex', '.ltx'],
    aliases: ['LaTeX', 'latex', 'tex', 'TeX'],
  });

  monaco.languages.setLanguageConfiguration('latex', {
    comments: { lineComment: '%' },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
    ],
  });

  monaco.languages.setMonarchTokensProvider('latex', {
    defaultToken: '',
    tokenPostfix: '.latex',

    tokenizer: {
      root: [
        [/\\[a-zA-Z@]+/, 'keyword'],
        [/\\./, 'keyword'],
        [/%.*$/, 'comment'],
        [/\$\$/, 'string', '@displaymath'],
        [/\$/, 'string', '@inlinemath'],
        [/\{/, 'delimiter.bracket'],
        [/\}/, 'delimiter.bracket'],
        [/\[/, 'delimiter.bracket'],
        [/\]/, 'delimiter.bracket'],
        [/\\begin\{[^}]+\}/, 'tag'],
        [/\\end\{[^}]+\}/, 'tag'],
      ],
      displaymath: [
        [/\$\$/, 'string', '@pop'],
        [/./, 'string'],
      ],
      inlinemath: [
        [/\$/, 'string', '@pop'],
        [/./, 'string'],
      ],
    },
  });
}
