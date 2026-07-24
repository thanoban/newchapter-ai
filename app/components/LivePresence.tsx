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
  callId: string;
  serverUrl: string;
  participantToken: string;
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
  const [credentials, setCredentials] = useState<SessionCredentials | null>(
    null,
  );
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  async function startSession() {
    if (isStarting || credentials) return;
    setError("");
    setIsStarting(true);

    try {
      const response = await fetch("/api/v1/avatar-sessions", {
        method: "POST",
      });
      const body = (await response.json()) as
        | SessionCredentials
        | { error?: string };

      if (!response.ok || !("participantToken" in body)) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "Could not start live presence.",
        );
      }
      setCredentials(body);
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

  if (!credentials) {
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

  return (
    <div className="live-presence" data-lk-theme="default">
      <LiveKitRoom
        token={credentials.participantToken}
        serverUrl={credentials.serverUrl}
        connect
        audio
        video={false}
        onDisconnected={() => setCredentials(null)}
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
            onClick={() => setCredentials(null)}
          >
            End
          </button>
        </div>
      </LiveKitRoom>
    </div>
  );
}
