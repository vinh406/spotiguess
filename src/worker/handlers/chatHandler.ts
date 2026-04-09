import { RoomManager } from "../lib/websocket";
import { MessageBuilders, broadcastToRoom, sendToSocket } from "../lib/websocket";
import type { ChatMessage } from "../../shared/types";
import { MAX_CHAT_MESSAGE_LENGTH } from "../../shared/constants";

export class ChatHandler {
  constructor(private roomManager: RoomManager) {}

  async handleChatMessage(ws: WebSocket, data: ChatMessage): Promise<void> {
    const session = this.roomManager.getUserSession(ws);
    if (!session) {
      sendToSocket(ws, MessageBuilders.error("You must join a room first"));
      return;
    }

    const trimmedContent = data.content?.trim() || "";
    if (!trimmedContent) return; // Ignore empty messages
    if (trimmedContent.length > MAX_CHAT_MESSAGE_LENGTH) {
      sendToSocket(
        ws,
        MessageBuilders.error(`Message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or less`),
      );
      return;
    }

    const message = MessageBuilders.chatMessage(
      trimmedContent,
      session.username,
      session.userId,
      session.room,
    );

    broadcastToRoom(this.roomManager.getSessions(), session.room, message);
  }
}
