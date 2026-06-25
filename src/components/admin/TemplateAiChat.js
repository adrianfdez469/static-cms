"use client";

import { useEffect, useRef, useState } from "react";

function parseSseChunk(buffer) {
  const events = [];
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    const line = part
      .split("\n")
      .find((entry) => entry.startsWith("data: "));
    if (!line) continue;

    try {
      events.push(JSON.parse(line.slice(6)));
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, remainder };
}

export default function TemplateAiChat({
  open,
  currentTemplate,
  onTemplateUpdate,
  onStreamingChange,
  onClose,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const templateBufferRef = useRef("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    onStreamingChange?.(streaming);
  }, [streaming, onStreamingChange]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setStreaming(true);
    templateBufferRef.current = "";

    const assistantMessage = { role: "assistant", content: "" };
    setMessages([...nextMessages, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/admin/template-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          currentTemplate,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? `Request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error("No response stream received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = parseSseChunk(buffer);
        buffer = remainder;

        for (const event of events) {
          if (event.type === "text") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + event.delta,
                };
              }
              return updated;
            });
          } else if (event.type === "template_delta") {
            templateBufferRef.current += event.delta;
            onTemplateUpdate?.(templateBufferRef.current);
          } else if (event.type === "template_complete") {
            templateBufferRef.current = event.html;
            onTemplateUpdate?.(event.html);
          } else if (event.type === "template_error") {
            setError(event.message);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch (submitError) {
      if (submitError.name !== "AbortError") {
        setError(
          submitError instanceof Error ? submitError.message : "Unexpected error."
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  if (!open) return null;

  return (
    <aside className="admin-ai-panel">
      <div className="admin-ai-header">
        <h3>Estilo con IA</h3>
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-ai-close"
          onClick={onClose}
          disabled={streaming}
        >
          Cerrar
        </button>
      </div>

      <p className="admin-ai-hint">
        Describe cómo quieres que se vea el template. Los cambios se aplican al
        editor; usa Guardar para persistirlos.
      </p>

      <div className="admin-ai-messages">
        {messages.length === 0 && (
          <p className="admin-ai-empty">
            Ejemplo: &quot;Diseño minimalista con tipografía serif y fondo
            crema&quot;
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`admin-ai-message admin-ai-message-${message.role}`}
          >
            <span className="admin-ai-message-role">
              {message.role === "user" ? "Tú" : "IA"}
            </span>
            <p>{message.content || (streaming && index === messages.length - 1 ? "…" : "")}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="admin-error admin-ai-error">{error}</p>}

      <form className="admin-ai-form" onSubmit={handleSubmit}>
        <textarea
          className="admin-ai-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Describe el estilo del template..."
          rows={3}
          disabled={streaming}
        />
        <div className="admin-ai-form-actions">
          {streaming ? (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleStop}
            >
              Detener
            </button>
          ) : (
            <button type="submit" className="admin-btn" disabled={!input.trim()}>
              Enviar
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}
