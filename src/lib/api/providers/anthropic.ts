import { APIProvider, APIConfig, APIResponse } from '../types';

export class AnthropicProvider implements APIProvider {
  async makeRequest(config: APIConfig, messages: Array<{role: string; content: string}>): Promise<APIResponse> {
    const systemText = messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n');

    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        messages: chatMessages,
        ...(systemText ? { system: systemText } : {}),
        max_tokens: config.maxTokens,
        temperature: config.temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API request failed');
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: data.usage
    };
  }
}
