# Avatar renderer

This service boundary owns real-time media only:

1. A short-lived LiveKit room is created by a trusted session API.
2. The voice worker receives the reviewed response from the orchestrator.
3. `attach_avatar` connects the official Beyond Presence LiveKit plugin.
4. Beyond Presence renders synchronized video and publishes it to the room.
5. The browser receives a short-lived participant token and subscribes.

The Beyond Presence key, LiveKit API secret, conversation transcript, and user
memory must never be sent to the browser. The renderer must not read durable
memory or decide what the assistant says.

The official integration requires a publicly accessible LiveKit server, so a
local-only LiveKit instance is not a production-equivalent test environment.
