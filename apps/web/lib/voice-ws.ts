import { getAccessToken } from "@/lib/api-client";

/**
 * WebSocket client for the voice therapy feature's live conversation.
 * Connects directly to FastAPI through Nginx's /voice/ws location (see
 * deploy/ec2/nginx.conf) — this is the one exception in the app to "the
 * browser only ever talks to this app's own same-origin proxy routes",
 * because Next.js Route Handlers can't proxy a WebSocket upgrade. The
 * connection is still same-host (same domain/port the page is served from,
 * just a different path Nginx routes differently), not a third-party
 * origin.
 *
 * Protocol (JSON text frames both ways) mirrors app/routers/voice_ws.py:
 *   client -> server: {"type": "transcript_chunk", "text": "..."}
 *   server -> client: {"type": "reply_token", "text": "..."}
 *                      {"type": "reply_done"}
 *                      {"type": "crisis_flag", "text": "..."}
 *                      {"type": "error", "detail": "..."}
 */

export type VoiceServerMessage =
  | { type: "reply_token"; text: string }
  | { type: "reply_done" }
  | { type: "crisis_flag"; text: string }
  | { type: "error"; detail: string };

export interface VoiceWsHandlers {
  onMessage: (message: VoiceServerMessage) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: () => void;
}

export class VoiceWebSocket {
  private socket: WebSocket | null = null;

  connect(sessionId: string, handlers: VoiceWsHandlers): void {
    const token = getAccessToken();
    if (!token) {
      handlers.onError?.();
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/voice/ws?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => handlers.onOpen?.();
    socket.onerror = () => handlers.onError?.();
    socket.onclose = (event) => handlers.onClose?.(event);
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as VoiceServerMessage;
        handlers.onMessage(message);
      } catch {
        // Malformed frame - ignore rather than crash the conversation.
      }
    };
  }

  sendTranscriptChunk(text: string): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: "transcript_chunk", text }));
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }
}
