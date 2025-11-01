import { z } from "zod";

// Zod schema for AI parse result
export const aiParseResultSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
});

export type AiParseResult = z.infer<typeof aiParseResultSchema>;

// Environment variables and feature flags
const AI_PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const AI_DEBUG = process.env.AI_DEBUG === "true";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

// Prompt template for parsing natural language into task data
const PARSE_PROMPT_TEMPLATE = `You are a task parser assistant. Parse the following natural language text into a structured task object.

Extract the following information:
- title (required): A concise title for the task
- description (optional): Additional details about the task
- dueDate (optional): ISO 8601 datetime string if a due date is mentioned
- priority (optional): A number from 1 (lowest) to 5 (highest) based on urgency indicators
- tags (optional): Array of relevant tags or categories
- recurrence (optional): One of "none", "daily", "weekly", "monthly", "yearly" if mentioned

Rules:
- The title should be clear and concise
- If no priority is specified, infer it from urgency indicators (e.g., "urgent" = 5, "low priority" = 1)
- For dates, convert relative dates (e.g., "tomorrow", "next week") to ISO 8601 format
- If no recurrence is mentioned, assume "none"
- Return ONLY valid JSON, no markdown, no explanations

Input text:
{input}

Return a JSON object with the structure:
{
  "title": "string (required)",
  "description": "string (optional)",
  "dueDate": "ISO 8601 datetime (optional)",
  "priority": 1-5 (optional),
  "tags": ["string"] (optional),
  "recurrence": "none|daily|weekly|monthly|yearly (optional)"
}`;

function log(message: string, data?: any) {
  if (AI_DEBUG) {
    console.log(`[AI Debug] ${message}`, data || "");
  }
}

// Provider interface
interface AIProvider {
  name: string;
  parse(input: string): Promise<AiParseResult>;
}

// Gemini provider adapter
class GeminiProvider implements AIProvider {
  name = "gemini";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async parse(input: string): Promise<AiParseResult> {
    log("GeminiProvider.parse called", { input });

    const prompt = PARSE_PROMPT_TEMPLATE.replace("{input}", input);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      log("Gemini API error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    log("Gemini API response", data);

    const textContent =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error("No content in Gemini response");
    }

    // Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(textContent);
    } catch (err) {
      log("Failed to parse Gemini JSON response", textContent);
      throw new Error("Invalid JSON from Gemini");
    }

    const validated = aiParseResultSchema.parse(parsed);
    log("Validated AI result", validated);

    return validated;
  }
}

// Ollama provider adapter
class OllamaProvider implements AIProvider {
  name = "ollama";
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async parse(input: string): Promise<AiParseResult> {
    log("OllamaProvider.parse called", { input, model: this.model });

    const prompt = PARSE_PROMPT_TEMPLATE.replace("{input}", input);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
          top_k: 1,
          top_p: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      log("Ollama API error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    log("Ollama API response", data);

    const textContent = data.response;

    if (!textContent) {
      throw new Error("No response from Ollama");
    }

    // Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(textContent);
    } catch (err) {
      log("Failed to parse Ollama JSON response", textContent);
      throw new Error("Invalid JSON from Ollama");
    }

    const validated = aiParseResultSchema.parse(parsed);
    log("Validated AI result", validated);

    return validated;
  }
}

// Provider factory
function getProvider(): AIProvider {
  log("Getting AI provider", { AI_PROVIDER });

  if (AI_PROVIDER === "gemini") {
    if (!GEMINI_API_KEY) {
      log("Gemini API key not found, falling back to Ollama");
      return new OllamaProvider(OLLAMA_BASE_URL, OLLAMA_MODEL);
    }
    return new GeminiProvider(GEMINI_API_KEY);
  }

  if (AI_PROVIDER === "ollama") {
    return new OllamaProvider(OLLAMA_BASE_URL, OLLAMA_MODEL);
  }

  // Default fallback to Ollama
  log("Unknown provider, falling back to Ollama");
  return new OllamaProvider(OLLAMA_BASE_URL, OLLAMA_MODEL);
}

// Main export function
export async function parseTaskWithAI(input: string): Promise<AiParseResult> {
  log("parseTaskWithAI called", { input });

  if (!input || typeof input !== "string" || input.trim().length === 0) {
    throw new Error("Input text is required");
  }

  const provider = getProvider();
  log(`Using provider: ${provider.name}`);

  try {
    const result = await provider.parse(input.trim());
    return result;
  } catch (error: any) {
    log("Error during AI parsing", error);
    throw error;
  }
}

// Export for testing and advanced usage
export { GeminiProvider, OllamaProvider };
