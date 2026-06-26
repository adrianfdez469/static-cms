import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompt";
import { APPLY_TEMPLATE_TOOL } from "./tools";
import { validateTemplate } from "./validateTemplate";

const MAX_ITERATIONS = 3;
const MAX_TOKENS = 8192;
const MAX_CLIENT_MESSAGES = 12;

export function truncateMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-MAX_CLIENT_MESSAGES);
}

export function extractHtmlFromPartialToolInput(partialJson) {
  const keyMatch = partialJson.match(/"html"\s*:\s*"/);
  if (!keyMatch) return null;

  let index = keyMatch.index + keyMatch[0].length;
  let result = "";

  while (index < partialJson.length) {
    const char = partialJson[index];

    if (char === '"') {
      break;
    }

    if (char === "\\" && index + 1 < partialJson.length) {
      const next = partialJson[index + 1];
      if (next === "n") result += "\n";
      else if (next === "t") result += "\t";
      else if (next === "r") result += "\r";
      else if (next === '"') result += '"';
      else if (next === "\\") result += "\\";
      else result += next;
      index += 2;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

export async function streamTemplateAi({ messages, currentTemplate, signal, onEvent }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    throw new Error("ANTHROPIC_MODEL is not configured.");
  }

  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(currentTemplate);
  let conversation = truncateMessages(messages);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    if (signal?.aborted) break;

    const toolBlocks = new Map();
    let streamedHtmlLength = 0;

    const anthropicStream = client.messages.stream({
      model,
      max_tokens: MAX_TOKENS,
      system,
      tools: [APPLY_TEMPLATE_TOOL],
      messages: conversation,
    });

    if (signal) {
      signal.addEventListener("abort", () => anthropicStream.controller.abort(), {
        once: true,
      });
    }

    for await (const event of anthropicStream) {
      if (signal?.aborted) break;

      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        onEvent({ type: "text", delta: event.delta.text });
        continue;
      }

      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        toolBlocks.set(event.index, {
          name: event.content_block.name,
          id: event.content_block.id,
          input: "",
        });
        continue;
      }

      if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
        const block = toolBlocks.get(event.index);
        if (!block) continue;

        block.input += event.delta.partial_json;

        if (block.name === "apply_template_html") {
          const html = extractHtmlFromPartialToolInput(block.input);
          if (html && html.length > streamedHtmlLength) {
            onEvent({
              type: "template_delta",
              delta: html.slice(streamedHtmlLength),
            });
            streamedHtmlLength = html.length;
          }
        }
      }
    }

    if (signal?.aborted) break;

    const finalMessage = await anthropicStream.finalMessage();
    const toolUseBlocks = finalMessage.content.filter((block) => block.type === "tool_use");

    if (toolUseBlocks.length === 0) {
      break;
    }

    const toolResults = [];
    let hadValidationError = false;

    for (const toolBlock of toolUseBlocks) {
      if (toolBlock.name !== "apply_template_html") {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: "Unknown tool.",
          is_error: true,
        });
        continue;
      }

      const html = typeof toolBlock.input?.html === "string" ? toolBlock.input.html : "";
      const validation = validateTemplate(html);

      if (!validation.ok) {
        hadValidationError = true;
        onEvent({ type: "template_error", message: validation.error });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: `Validation failed: ${validation.error}. Please fix and call apply_template_html again.`,
          is_error: true,
        });
      } else {
        onEvent({ type: "template_complete", html: validation.html });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: "Template applied successfully.",
        });
      }
    }

    conversation = [
      ...conversation,
      { role: "assistant", content: finalMessage.content },
      { role: "user", content: toolResults },
    ];

    if (!hadValidationError) {
      break;
    }
  }
}
