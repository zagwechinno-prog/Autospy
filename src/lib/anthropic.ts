import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to run AI-powered pipeline stages."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

interface StructuredCallOptions {
  system: string;
  userMessage: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Anthropic.Tool.InputSchema;
  maxTokens?: number;
}

/**
 * Forces the model to respond through a single tool call whose input_schema
 * mirrors the artifact we want back, so every stage gets typed JSON instead
 * of free text to parse.
 */
export async function callStructured<T>(opts: StructuredCallOptions): Promise<T> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content: opts.userMessage }],
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.inputSchema,
      },
    ],
    tool_choice: { type: "tool", name: opts.toolName },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Model did not return structured output for " + opts.toolName);
  }
  return toolUse.input as T;
}
