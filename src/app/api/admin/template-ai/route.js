import { isAuthenticated } from "@/lib/auth";
import { streamTemplateAi } from "@/lib/templateAi/streamAnthropic";

export const runtime = "nodejs";

function encodeSseEvent(payload) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function normalizeClientMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content : "",
    }))
    .filter((message) => message.content.trim());
}

export async function POST(request) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = normalizeClientMessages(body.messages);
  const currentTemplate =
    typeof body.currentTemplate === "string" ? body.currentTemplate : "";

  if (messages.length === 0) {
    return Response.json({ error: "At least one message is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      try {
        await streamTemplateAi({
          messages,
          currentTemplate,
          signal: request.signal,
          onEvent: send,
        });
        send({ type: "done" });
      } catch (error) {
        if (request.signal.aborted) {
          send({ type: "done" });
        } else {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "Unexpected error.",
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
