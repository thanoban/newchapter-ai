"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { LivePresence } from "./LivePresence";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type TurnResponse = {
  message: string;
  riskLevel: "standard" | "elevated" | "immediate";
  contributors: string[];
};

const careTeam = [
  { id: "safety", mark: "S", name: "Safety sentinel", role: "Checks risk first" },
  { id: "listener", mark: "L", name: "Deep listener", role: "Names what hurts" },
  { id: "reframe", mark: "R", name: "Reframe guide", role: "Loosens painful loops" },
  { id: "coach", mark: "N", name: "Next-step coach", role: "Finds one kind action" },
  { id: "critic", mark: "Q", name: "Care reviewer", role: "Reviews tone and safety" },
];

const welcome: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "You do not have to be okay here. We can slow this moment down together. What feels heaviest right now?",
};

export function HealingRoom() {
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>(["safety"]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function sendTurn() {
    const content = input.trim();
    if (!content || isSending) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content },
    ]);
    setInput("");
    setIsSending(true);
    setActiveAgents(["safety", "listener"]);

    try {
      const response = await fetch("/api/v1/turns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: content,
          history: messages.slice(-8),
        }),
      });

      if (!response.ok) throw new Error("Care service unavailable");
      setActiveAgents(["safety", "listener", "reframe", "coach", "critic"]);
      const result = (await response.json()) as TurnResponse;

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.message,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I’m still here. The connection slipped for a moment. Take one slow breath, then try sending that again.",
        },
      ]);
    } finally {
      setIsSending(false);
      setActiveAgents(["safety"]);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendTurn();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendTurn();
    }
  }

  function resetSession() {
    setMessages([welcome]);
    setInput("");
    setActiveAgents(["safety"]);
  }

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Sessions">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          NewChapter
        </div>

        <button className="new-session" type="button" onClick={resetSession}>
          <span aria-hidden="true">＋</span> New reflection
        </button>

        <p className="sidebar-label">Today</p>
        <div className="session-card">
          <strong>A quiet place to land</strong>
          <span>Private session · just now</span>
        </div>

        <div className="privacy-note">
          <b>Private by design</b>
          The avatar provider receives only the media needed for your live
          session—not your full journal or long-term memory.
        </div>
      </aside>

      <section className="room" aria-label="Healing conversation">
        <header className="room-header">
          <div>
            <span className="eyebrow">Presence room</span>
            <h1>A steadier place after heartbreak</h1>
          </div>
          <div className="status">
            <span className="status-dot" aria-hidden="true" />
            Care team ready
          </div>
        </header>

        <div className="conversation">
          <section className="presence-stage" aria-labelledby="presence-title">
            <LivePresence />
            <div className="presence-copy">
              <span className="eyebrow">Aadhi · presence companion</span>
              <h2 id="presence-title">Feel it without facing it alone.</h2>
              <p>
                Aadhi gives one warm face and voice to a coordinated care team.
                She will not rush grief, diagnose you, or pretend painful
                memories can simply be erased.
              </p>
              <div className="presence-meta">
                <span className="meta-pill">Beyond Presence ready</span>
                <span className="meta-pill">Vertex AI orchestration</span>
                <span className="meta-pill">Safety-first routing</span>
              </div>
            </div>
          </section>

          <div className="messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`message ${message.role}`} key={message.id}>
                <span className="message-label">
                  {message.role === "assistant" ? "Aadhi" : "You"}
                </span>
                {message.content}
              </div>
            ))}
            {isSending ? (
              <div className="message assistant thinking" aria-label="Care team is reflecting">
                <span />
                <span />
                <span />
              </div>
            ) : null}
            <div ref={messagesEnd} />
          </div>
        </div>

        <form className="composer" onSubmit={submit}>
          <textarea
            aria-label="Share what is on your mind"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what keeps circling in your mind…"
            maxLength={4000}
          />
          <div className="composer-actions">
            <span className="composer-hint">
              Enter to send · Shift + Enter for a new line
            </span>
            <button
              className="send-button"
              type="submit"
              disabled={!input.trim() || isSending}
            >
              {isSending ? "Listening…" : "Send"}
            </button>
          </div>
        </form>
      </section>

      <aside className="care-rail" aria-label="Care team">
        <span className="eyebrow">Behind Aadhi</span>
        <h2>Your care circle</h2>
        <p className="care-intro">
          Specialists collaborate privately. One grounded response comes back
          to you.
        </p>

        <div className="agent-list">
          {careTeam.map((agent) => (
            <div
              className={`agent-card ${
                activeAgents.includes(agent.id) ? "active" : ""
              }`}
              key={agent.id}
            >
              <span className="agent-icon" aria-hidden="true">
                {agent.mark}
              </span>
              <span className="agent-copy">
                <strong>{agent.name}</strong>
                <span>{agent.role}</span>
              </span>
              <span className="agent-state" aria-hidden="true" />
            </div>
          ))}
        </div>

        <div className="grounding-card">
          <strong>Right now, not forever.</strong>
          <p>
            The goal is not to delete a person or memory. It is to reduce the
            grip of the thought and help you choose your next safe action.
          </p>
        </div>

        <p className="safety-note">
          <b>NewChapter is emotional support, not therapy or emergency care.</b>{" "}
          If you may hurt yourself or someone else, contact local emergency
          services now and ask a trusted person to stay with you.
        </p>
      </aside>
    </main>
  );
}
