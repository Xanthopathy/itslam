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

  constructor(adapter: RealtimeAdapter) {
    this.adapter = adapter;
  }

  public async connect(): Promise<void> {
    await this.adapter.connect();
  }

  public async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  public async subscribeToRoom(
    roomCode: string,
    onMessage: (message: RoomActionMessage) => void,
  ): Promise<void> {
    const topic = buildRoomTopic(roomCode);

    await this.adapter.subscribe(topic, (raw) => {
      const parsed = decodeMessage(raw);
      if (!parsed) return;
      onMessage(parsed);
    });
  }

  public async publishToRoom(message: RoomActionMessage): Promise<void> {
    const topic = buildRoomTopic(message.roomCode);
    const payload = encodeMessage(message);

    await this.adapter.publish(topic, payload);
  }
}
