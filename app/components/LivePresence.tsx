"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useState } from "react";

type SessionCredentials = {
  mode: "livekit";
  callId: string;
  serverUrl: string;
  participantToken: string;
};

type EmbedSession = {
  mode: "embed";
  embedUrl: string;
};

function AvatarTrack() {
  const tracks = useTracks([Track.Source.Camera], {
    onlySubscribed: true,
  });
  const avatarTrack = tracks.find((track) => !track.participant.isLocal);

  if (!avatarTrack) {
    return (
      <div className="avatar-waiting" role="status">
        <span className="avatar-pulse" aria-hidden="true" />
        Nelly is joining…
      </div>
    );
  }

  return <VideoTrack className="avatar-video" trackRef={avatarTrack} />;
}

export function LivePresence() {
  const [session, setSession] = useState<
    SessionCredentials | EmbedSession | null
  >(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  async function startSession() {
    if (isStarting || session) return;
    setError("");
    setIsStarting(true);

    try {
      const response = await fetch("/api/v1/avatar-sessions", {
        method: "POST",
      });
      const body = (await response.json()) as
        | SessionCredentials
        | EmbedSession
        | { error?: string };

      if (
        !response.ok ||
        (!("participantToken" in body) && !("embedUrl" in body))
      ) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "Could not start live presence.",
        );
      }
      setSession(body);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start live presence.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  if (!session) {
    return (
      <div className="avatar-orbit avatar-connect">
        <span className="avatar-ring" />
        <span className="avatar-ring" />
        <div className="avatar" />
        <button
          className="presence-button"
          type="button"
          onClick={startSession}
          disabled={isStarting}
        >
          {isStarting ? "Opening room…" : "Talk with Nelly"}
        </button>
        {error ? <span className="presence-error">{error}</span> : null}
      </div>
    );
  }

  if (session.mode === "embed") {
    return (
      <div
        className="mentor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-call-title"
      >
        <div className="mentor-call">
          <header className="mentor-call-header">
            <div>
              <span className="eyebrow">Live presence mentor</span>
              <h2 id="mentor-call-title">Talk with Nelly</h2>
            </div>
            <button
              type="button"
              className="mentor-close"
              onClick={() => setSession(null)}
              aria-label="Close mentor call"
            >
              Close
            </button>
          </header>
          <iframe
            title="Talk with Nelly"
            src={session.embedUrl}
            allow="autoplay; camera; microphone; fullscreen"
            allowFullScreen
          />
          <footer className="mentor-call-footer">
            Speak naturally, then leave a short pause so Nelly can respond.
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="live-presence" data-lk-theme="default">
      <LiveKitRoom
        token={session.participantToken}
        serverUrl={session.serverUrl}
        connect
        audio
        video={false}
        onDisconnected={() => setSession(null)}
        onError={(roomError) => setError(roomError.message)}
      >
        <AvatarTrack />
        <RoomAudioRenderer />
        <div className="live-controls">
          <StartAudio label="Enable audio" />
          <span className="live-indicator">
            <span aria-hidden="true" /> Live with Nelly
          </span>
          <button
            type="button"
            className="end-call"
            onClick={() => setSession(null)}
          >
            End
          </button>
        </div>
      </LiveKitRoom>
    </div>
  );
}
