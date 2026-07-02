const STOPWORDS_PT = new Set([
  "a", "ao", "aos", "aquela", "aquelas", "aquele", "aqueles",
  "aquilo", "as", "ate", "com", "como", "contra", "da", "das",
  "de", "dela", "delas", "dele", "deles", "depois", "do", "dos",
  "e", "ela", "elas", "ele", "eles", "em", "entre", "era", "eram",
  "essa", "essas", "esse", "esses", "esta", "estas", "estava",
  "este", "estes", "eu", "foi", "foram", "ha", "isso", "isto",
  "ja", "lhe", "lhes", "mais", "mas", "me", "mesmo", "meu",
  "meus", "muito", "na", "nas", "nem", "no", "nos", "num",
  "numa", "o", "os", "ou", "para", "pela", "pelas", "pelo",
  "pelos", "por", "qual", "quando", "que", "quem", "se", "sem",
  "seu", "seus", "so", "sobre", "sua", "suas", "tambem", "teu",
  "teus", "todo", "todos", "tu", "um", "uma", "voce", "voces",
  "dum", "duma", "duns", "dumas",
  "noutro", "noutra", "naquilo", "as", "aos", "proprio",
]);

const STOPWORDS_EN = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
  "for", "of", "with", "by", "from", "as", "is", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "can", "could", "may", "might", "shall", "should",
  "it", "its", "this", "that", "these", "those", "i", "me", "my",
  "we", "us", "our", "you", "your", "he", "him", "his", "she",
  "her", "they", "them", "their", "what", "which", "who", "whom",
  "not", "no", "nor", "so", "if", "then", "than", "too", "very",
  "just", "about", "also", "up", "out", "more", "most", "such",
  "each", "all", "both", "every", "own", "same", "here", "there",
  "when", "where", "why", "how",
]);

function lematizarSimples(palavra, idioma = "pt") {
  let p = palavra.toLowerCase().replace(/[.,;:!? '"()\[\]{}]/g, "");
  if (!p || p.length < 4) return p;

  if (idioma === "pt") {
    if (p.endsWith("mos") && p.length > 6) return p.slice(0, -3) + "r";
    if (p.endsWith("ram") && p.length > 6) return p.slice(0, -3) + "r";
    if (p.endsWith("ndo")) return p.slice(0, -3) + "r";
    if (p.endsWith("dos") || p.endsWith("das")) return p.slice(0, -2);
    if (p.endsWith("cao")) return p.slice(0, -3) + "r";
    if (p.endsWith("coes")) return p.slice(0, -4) + "r";
    if (p.endsWith("mente")) return p.slice(0, -5);
    if (p.endsWith("s") && p.length > 3 && !p.endsWith("ss")) return p.slice(0, -1);
  }

  if (idioma === "en") {
    if (p.endsWith("ing") && p.length > 5) return p.slice(0, -3);
    if (p.endsWith("ed") && p.length > 4) return p.slice(0, -2);
    if (p.endsWith("ies")) return p.slice(0, -3) + "y";
    if (p.endsWith("es") && p.length > 4) return p.slice(0, -2);
    if (p.endsWith("s") && p.length > 3 && !p.endsWith("ss")) return p.slice(0, -1);
  }

  return p;
}

function palavrasRelevantes(texto, idioma = "pt") {
  const stopwords = idioma === "pt" ? STOPWORDS_PT : STOPWORDS_EN;
  const tokens = texto.toLowerCase().match(/[a-zA-ZáéíóúâêôãõçüñÁÉÍÓÚÂÊÔÃÕÇÜÑ]+/g) || [];
  return tokens.filter(t => !stopwords.has(t) && t.length > 2);
}

function detectarRepeticoesLocais(paragrafos, idioma = "pt", limiteFreq = 2) {
  const lemmaCounts = {};
  const lemmaParagrafos = {};

  for (let i = 0; i < paragrafos.length; i++) {
    const palavras = palavrasRelevantes(paragrafos[i], idioma).filter(p => p.length > 3);
    const lemasVistosNoPara = new Set();

    for (const palavra of palavras) {
      const lema = lematizarSimples(palavra, idioma);
      if (!lemmaCounts[lema]) {
        lemmaCounts[lema] = {};
        lemmaParagrafos[lema] = new Set();
      }
      lemmaCounts[lema][palavra] = (lemmaCounts[lema][palavra] || 0) + 1;

      if (!lemasVistosNoPara.has(lema)) {
        lemmaParagrafos[lema].add(i);
        lemasVistosNoPara.add(lema);
      }
    }
  }

  const repetidas = [];
  for (const [lema, counter] of Object.entries(lemmaCounts)) {
    const total = Object.values(counter).reduce((a, b) => a + b, 0);
    if (total >= limiteFreq && lemmaParagrafos[lema].size >= 1) {
      const palavraMaisComum = Object.entries(counter).sort((a, b) => b[1] - a[1])[0][0];
      repetidas.push({
        palavra: palavraMaisComum,
        lema,
        ocorrencias: total,
        paragrafos: Array.from(lemmaParagrafos[lema]).sort((a, b) => a - b),
        sugestoes: [],
        fonte: "local",
      });
    }
  }

  return repetidas.sort((a, b) => b.ocorrencias - a.ocorrencias);
}

function deduplicarPalavras(palavras) {
  const mapa = new Map();

  for (const p of palavras) {
    const chave = p.palavra.toLowerCase();
    if (mapa.has(chave)) {
      const existente = mapa.get(chave);
      existente.ocorrencias += p.ocorrencias;
      existente.paragrafos = [...new Set([...existente.paragrafos, ...p.paragrafos])].sort((a, b) => a - b);
      existente.sugestoes = [...new Set([...existente.sugestoes, ...(p.sugestoes || [])])];
    } else {
      mapa.set(chave, {
        palavra: p.palavra,
        lema: p.lema || p.palavra,
        ocorrencias: p.ocorrencias,
        paragrafos: [...p.paragrafos],
        sugestoes: [...(p.sugestoes || [])],
        fonte: p.fonte || "llm",
      });
    }
  }

  return Array.from(mapa.values())
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

export { detectarRepeticoesLocais, deduplicarPalavras };
