// src/lib/network/client.ts
import {
  decodeMessage,
  encodeMessage,
  type RoomActionMessage,
} from "./messages";
import { buildRoomTopic } from "./topics";

export type RealtimeAdapter = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: (topic: string, onMessage: (raw: string) => void) => Promise<void>;
  publish: (topic: string, payload: string) => Promise<void>;
};

export class NetworkClient {
  private readonly adapter: RealtimeAdapter;
  private readonly handlers = new Map<
    string,
    Set<(message: RoomActionMessage) => void>
  >();
  private readonly subscribedTopics = new Set<string>();

  constructor(adapter: RealtimeAdapter) {
    this.adapter = adapter;
  }

  public async connect(): Promise<void> {
    await this.adapter.connect();
  }

  public async disconnect(): Promise<void> {
    await this.adapter.disconnect();
    this.handlers.clear();
    this.subscribedTopics.clear();
  }

  public async subscribeToRoom(
    roomCode: string,
    onMessage: (message: RoomActionMessage) => void,
  ): Promise<void> {
    const topic = buildRoomTopic(roomCode);

    let topicHandlers = this.handlers.get(topic);
    if (!topicHandlers) {
      topicHandlers = new Set();
      this.handlers.set(topic, topicHandlers);
    }

    if (!this.subscribedTopics.has(topic)) {
      this.subscribedTopics.add(topic);
      await this.adapter.subscribe(topic, (raw) => {
        const parsed = decodeMessage(raw);
        if (!parsed) return;
        for (const handler of this.handlers.get(topic) ?? []) {
          handler(parsed);
        }
      });
    }
  }

  public unsubscribeFromRoom(
    roomCode: string,
    onMessage: (message: RoomActionMessage) => void,
  ): void {
    const topic = buildRoomTopic(roomCode);
    this.handlers.get(topic)?.delete(onMessage);
  }

  public async publishToRoom(message: RoomActionMessage): Promise<void> {
    const topic = buildRoomTopic(message.roomCode);
    const payload = encodeMessage(message);
    await this.adapter.publish(topic, payload);
  }
}
