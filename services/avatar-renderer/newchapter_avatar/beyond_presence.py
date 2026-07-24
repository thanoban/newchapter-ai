from __future__ import annotations

import os
from typing import Any

from livekit.plugins import bey


async def attach_avatar(agent_session: Any, room: Any) -> Any:
    """Attach Beyond Presence rendering to an established LiveKit voice session.

    Conversation intelligence stays in the orchestrator. This adapter only
    receives the voice session audio needed to render synchronized media.
    """

    avatar_id = os.environ["BEY_AVATAR_ID"]
    avatar_session = bey.AvatarSession(avatar_id=avatar_id)
    await avatar_session.start(agent_session, room=room)
    return avatar_session
