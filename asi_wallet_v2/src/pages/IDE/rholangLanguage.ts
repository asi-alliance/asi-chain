import * as monaco from 'monaco-editor';

export const RHOLANG_LANGUAGE_ID = 'rholang';

export const rholangLanguageDefinition: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.rho',

  keywords: [
    'new', 'in', 'for', 'contract', 'match', 'if', 'else', 'select',
    'bundle', 'Nil', 'true', 'false', 'stdout', 'and', 'or', 'not'
  ],

  // Define the different token types
  tokenizer: {
    root: [
      // Comments
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-terminated string
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
      
      // Backtick strings (for URIs)
      [/`([^`])*`/, 'string.uri'],

      // Numbers
      [/\d+/, 'number'],

      // Identifiers and keywords
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],

      // Whitespace
      { include: '@whitespace' },

      // Delimiters and operators
      [/[{}()[\]]/, '@brackets'],
      [/[!|@<>+\-*/%=&^~?:]+/, 'operator'],
      [/[;,.]/, 'delimiter'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment']
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop']
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop']
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],
  },
};

export const rholangTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'string', foreground: 'A31515' },
    { token: 'string.uri', foreground: '0451A5' },
    { token: 'number', foreground: '09885A' },
    { token: 'operator', foreground: '000000' },
    { token: 'identifier', foreground: '001080' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#000000',
    'editor.lineHighlightBackground': '#F0F0F0',
    'editor.selectionBackground': '#ADD6FF',
    'editor.inactiveSelectionBackground': '#E5EBF1',
    'editorLineNumber.foreground': '#237893',
    'editorLineNumber.activeForeground': '#0B216F',
    'editorCursor.foreground': '#000000',
    'editor.wordHighlightBackground': '#D3D3D3',
    'editor.wordHighlightStrongBackground': '#B4B4B4',
    'editorIndentGuide.background': '#D3D3D3',
    'editorIndentGuide.activeBackground': '#939393',
    'editorRuler.foreground': '#D3D3D3',
  }
};

export const rholangDarkTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'string.uri', foreground: '9CDCFE' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'operator', foreground: 'D4D4D4' },
    { token: 'identifier', foreground: '9CDCFE' },
  ],
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4',
    'editor.lineHighlightBackground': '#2A2D2E',
    'editor.selectionBackground': '#264F78',
    'editor.inactiveSelectionBackground': '#3A3D41',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#C6C6C6',
    'editorCursor.foreground': '#AEAFAD',
    'editor.wordHighlightBackground': '#515C6A',
    'editor.wordHighlightStrongBackground': '#5A5A5A',
    'editorIndentGuide.background': '#404040',
    'editorIndentGuide.activeBackground': '#707070',
    'editorRuler.foreground': '#5A5A5A',
  }
};

export function registerRholangLanguage() {
  // Register the language
  monaco.languages.register({ id: RHOLANG_LANGUAGE_ID });

  // Register the tokens provider
  monaco.languages.setMonarchTokensProvider(RHOLANG_LANGUAGE_ID, rholangLanguageDefinition);

  // Register the themes (define them first before using)
  try {
    monaco.editor.defineTheme('rholang-light', rholangTheme);
    monaco.editor.defineTheme('rholang-dark', rholangDarkTheme);
  } catch (e) {
    // Themes might already be defined, ignore error
    console.log('Themes already defined');
  }

  // Register completion provider for common patterns
  monaco.languages.registerCompletionItemProvider(RHOLANG_LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions = [
        {
          label: 'new',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'new channel in {\n  \n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Create a new channel',
          range: range
        },
        {
          label: 'contract',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'contract name(params) = {\n  \n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a contract',
          range: range
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'for(pattern <- channel) {\n  \n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Receive on a channel',
          range: range
        },
        {
          label: 'stdout',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'stdout!("message")',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Print to stdout',
          range: range
        },
        {
          label: 'match',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'match expr {\n  pattern => {  }\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Pattern matching',
          range: range
        }
      ];

      return { suggestions: suggestions };
    }
  });
}