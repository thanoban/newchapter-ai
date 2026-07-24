"use client";

import { FormEvent, useState } from "react";
import { LivePresence } from "./LivePresence";

type TurnResponse = {
  message: string;
  riskLevel: "standard" | "elevated" | "immediate";
  contributors: string[];
};

const situations = [
  "A recent breakup",
  "No-contact feels hard",
  "I still miss them",
  "I feel rejected",
  "I keep blaming myself",
  "It’s complicated",
];

const needs = [
  "Calm my thoughts",
  "Understand what happened",
  "Resist contacting them",
  "Take one next step",
];

export function HealingRoom() {
  const [situation, setSituation] = useState("");
  const [need, setNeed] = useState("");
  const [context, setContext] = useState("");
  const [reflection, setReflection] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!situation || !need || isSending) return;
    setIsSending(true);
    setReflection("");

    const message = [
      `My situation: ${situation}.`,
      `What I need right now: ${need}.`,
      context.trim() ? `A little more context: ${context.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const response = await fetch("/api/v1/turns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, message, history: [] }),
      });
      if (!response.ok) throw new Error("Care service unavailable");
      const result = (await response.json()) as TurnResponse;
      setReflection(result.message);
    } catch {
      setReflection(
        "The connection slipped for a moment. Take one slow breath and try your check-in again.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function reset() {
    setSituation("");
    setNeed("");
    setContext("");
    setReflection("");
  }

  return (
    <main className="checkin-shell" aria-label="NewChapter guided check-in">
      <header className="checkin-header">
        <a className="brand" href="#" aria-label="NewChapter home">
          <span className="brand-mark" aria-hidden="true" />
          NewChapter
        </a>
        <span className="private-label">Private guided reflection</span>
      </header>

      <section className="checkin-grid">
        <div className="checkin-intro">
          <span className="eyebrow">Your story, at your pace</span>
          <h2>Help us understand where your heart is today.</h2>
          <p>
            Choose what fits. Aadhi’s care team will return one grounded
            reflection—not a long chat.
          </p>
          <div className="video-card">
            <LivePresence />
            <div>
              <strong>Prefer to talk face to face?</strong>
              <p>
                Open a live conversation with Aadhi, our AI video avatar
                companion.
              </p>
            </div>
          </div>
        </div>

        <div className="checkin-panel">
          {!reflection ? (
            <form onSubmit={submit}>
              <fieldset>
                <legend>What best describes this moment?</legend>
                <div className="choice-grid">
                  {situations.map((item) => (
                    <label className={situation === item ? "selected" : ""} key={item}>
                      <input
                        type="radio"
                        name="situation"
                        value={item}
                        checked={situation === item}
                        onChange={() => setSituation(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>What would help most right now?</legend>
                <div className="choice-grid need-grid">
                  {needs.map((item) => (
                    <label className={need === item ? "selected" : ""} key={item}>
                      <input
                        type="radio"
                        name="need"
                        value={item}
                        checked={need === item}
                        onChange={() => setNeed(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="context-label">
                Anything else you want us to know? <span>Optional</span>
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="A few sentences are enough…"
                  maxLength={1200}
                />
              </label>

              <button
                className="reflection-button"
                type="submit"
                disabled={!situation || !need || isSending}
              >
                {isSending ? "Creating your reflection…" : "Create my reflection"}
              </button>
            </form>
          ) : (
            <div className="reflection-result" aria-live="polite">
              <span className="eyebrow">A reflection for this moment</span>
              <h3>You don’t have to solve the whole story today.</h3>
              <p>{reflection}</p>
              <button type="button" onClick={reset}>
                Begin a new check-in
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="checkin-footer">
        <span>Emotional support—not therapy or emergency care.</span>
        <span>Text reflection is free · AI video is limited to 3 sessions daily</span>
      </footer>
    </main>
  );
}
