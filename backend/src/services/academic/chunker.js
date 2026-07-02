const TOKEN_ESTIMATE = 4;

function estimarTokens(texto) {
  return Math.ceil(texto.length / TOKEN_ESTIMATE);
}

export function chunkText(textBlocks, maxTokens = 2048, overlap = 1) {
  if (!textBlocks || textBlocks.length === 0) return [];

  const chunks = [];
  let currentBlocks = [];
  let currentTokens = 0;
  let startIdx = 0;
  let chunkIndex = 0;

  for (let i = 0; i < textBlocks.length; i++) {
    const bloco = textBlocks[i];
    const blocoTokens = estimarTokens(bloco);

    if (currentTokens + blocoTokens > maxTokens && currentBlocks.length > 0) {
      chunks.push({
        index: chunkIndex,
        text: currentBlocks.join('\n\n'),
        startBlock: startIdx,
        endBlock: i,
      });
      chunkIndex++;

      const overlapStart = Math.max(startIdx, i - overlap);
      currentBlocks = textBlocks.slice(overlapStart, i);
      currentTokens = currentBlocks.reduce((sum, b) => sum + estimarTokens(b), 0);
      startIdx = overlapStart;

      currentBlocks.push(bloco);
      currentTokens += blocoTokens;
    } else {
      currentBlocks.push(bloco);
      currentTokens += blocoTokens;
    }
  }

  if (currentBlocks.length > 0) {
    chunks.push({
      index: chunkIndex,
      text: currentBlocks.join('\n\n'),
      startBlock: startIdx,
      endBlock: textBlocks.length,
    });
  }

  return chunks;
}
