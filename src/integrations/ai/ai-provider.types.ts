export interface AITextGenerationRequest {
  systemInstruction: string;
  prompt: string;
}

export interface AITextGenerationResult {
  text: string;
  model: string;
}

export interface AIProvider {
  generateText(
    request: AITextGenerationRequest,
  ): Promise<AITextGenerationResult>;
}