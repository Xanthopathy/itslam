// src/lib/network/adapters/broadcastChannelAdapter.ts
//
// Stand-in for the real MQTT/HiveMQ adapter (still unbuilt per PLAN.MD).
// Uses the browser's BroadcastChannel API, which only works same-origin,
// cross-tab/window within the same browser - perfect for local dev testing
// (open multiple tabs to simulate multiple players) but NOT a real network
// transport. Swap this out for the real WSS adapter later; it implements
// the same RealtimeAdapter interface so the swap should be a one-line change
// wherever NetworkClient is constructed.
//
// IMPORTANT ASYMMETRY: BroadcastChannel does NOT deliver a message back to
// the sender's own channel instance. Real MQTT brokers typically DO echo a
// client's own publish back to it (which is why sync.ts has an echo-guard
// TODO). Testing with this adapter cannot surface echo-guard bugs - that
// TODO remains relevant once the real adapter is wired in, it's just not
// exercised here.
import type { RealtimeAdapter } from "../client";

export function createBroadcastChannelAdapter(): RealtimeAdapter {
  const channels = new Map<string, BroadcastChannel>();

  function getChannel(topic: string): BroadcastChannel {
    let channel = channels.get(topic);
    if (!channel) {
      channel = new BroadcastChannel(topic);
      channels.set(topic, channel);
    }
    return channel;
  }

  return {
    async connect() {
      // No handshake needed - channels open lazily per topic on first use.
    },

    async disconnect() {
      for (const channel of channels.values()) {
        channel.close();
      }
      channels.clear();
    },

    async subscribe(topic, onMessage) {
      const channel = getChannel(topic);
      channel.onmessage = (event: MessageEvent<string>) => {
        onMessage(event.data);
      };
    },

    async publish(topic, payload) {
      const channel = getChannel(topic);
      channel.postMessage(payload);
    },
  };
}
