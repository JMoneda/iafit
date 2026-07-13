export interface PromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

export interface PromptResult {
  description: string;
  messages: PromptMessage[];
}

export interface PromptModule {
  name: string;
  description: string;
  build: () => PromptResult;
}
