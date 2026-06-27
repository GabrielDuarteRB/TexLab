import config from '../config/index.js';

class AiService {
  constructor() {
    this.enabled = !!config.ai.apiKey;
  }

  async suggest(latexContent, instruction) {
    if (!this.enabled) {
      return {
        success: false,
        error: 'AI not configured. Set AI_API_KEY in .env file.',
      };
    }

    try {
      const response = await fetch(
        config.ai.provider === 'anthropic'
          ? 'https://api.anthropic.com/v1/messages'
          : 'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: this._getHeaders(),
          body: JSON.stringify(this._getBody(latexContent, instruction)),
        }
      );

      const data = await response.json();
      const suggestion = this._extractResponse(data);

      return { success: true, suggestion };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  _getHeaders() {
    if (config.ai.provider === 'anthropic') {
      return {
        'Content-Type': 'application/json',
        'x-api-key': config.ai.apiKey,
        'anthropic-version': '2023-06-01',
      };
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.ai.apiKey}`,
    };
  }

  _getBody(latexContent, instruction) {
    const systemPrompt = `You are a LaTeX expert assistant. Help users write, fix, and improve LaTeX documents. Return only the LaTeX code or the fix, no markdown wrapping.`;

    const userMessage = `Instruction: ${instruction}\n\nLaTeX content:\n${latexContent}`;

    if (config.ai.provider === 'anthropic') {
      return {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      };
    }

    return {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    };
  }

  _extractResponse(data) {
    if (config.ai.provider === 'anthropic') {
      return data.content?.[0]?.text || '';
    }
    return data.choices?.[0]?.message?.content || '';
  }
}

export default new AiService();
