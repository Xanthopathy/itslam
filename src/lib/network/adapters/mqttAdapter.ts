import mqtt, { type MqttClient } from "mqtt";
import type { RealtimeAdapter } from "../client";

const DEFAULT_BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";

export function createMqttAdapter(
  brokerUrl = DEFAULT_BROKER_URL,
): RealtimeAdapter {
  let client: MqttClient | undefined;
  let hasReportedConnectionError = false;
  const handlers = new Map<string, (raw: string) => void>();

  function requireClient(): MqttClient {
    if (!client) {
      throw new Error("MQTT client is not connected");
    }
    return client;
  }

  return {
    async connect() {
      if (client?.connected) return;

      const existingClient = client;

      if (existingClient) {
        await new Promise<void>((resolve, reject) => {
          const handleConnect = () => {
            window.clearTimeout(timeoutId);
            resolve();
          };

          const timeoutId = window.setTimeout(() => {
            existingClient.off("connect", handleConnect);
            reject(new Error("MQTT reconnect timed out"));
          }, 10_000);

          existingClient.once("connect", handleConnect);
        });

        return;
      }

      client = mqtt.connect(brokerUrl, {
        clean: true,
        connectTimeout: 10_000,
        reconnectPeriod: 2_000,
        clientId: `itslam-${crypto.randomUUID()}`,
      });

      client.on("message", (topic, payload) => {
        handlers.get(topic)?.(payload.toString());
      });

      client.on("error", (error) => {
        if (!hasReportedConnectionError) {
          console.error("MQTT connection error:", error);
          hasReportedConnectionError = true;
        }
      });

      await new Promise<void>((resolve, reject) => {
        const mqttClient = requireClient();

        const handleConnect = () => {
          hasReportedConnectionError = false;
          mqttClient.off("error", handleError);
          resolve();
        };

        const handleError = (error: Error) => {
          mqttClient.off("connect", handleConnect);

          if (client === mqttClient) {
            client = undefined;
          }

          mqttClient.end(true);
          reject(error);
        };

        mqttClient.once("connect", handleConnect);
        mqttClient.once("error", handleError);
      });
    },

    async disconnect() {
      if (!client) return;

      const mqttClient = client;
      client = undefined;
      handlers.clear();

      await new Promise<void>((resolve) => {
        mqttClient.end(true, {}, () => resolve());
      });
    },

    async subscribe(topic, onMessage) {
      const mqttClient = requireClient();
      handlers.set(topic, onMessage);

      await new Promise<void>((resolve, reject) => {
        mqttClient.subscribe(topic, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },

    async publish(topic, payload) {
      const mqttClient = requireClient();

      await new Promise<void>((resolve, reject) => {
        mqttClient.publish(topic, payload, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}
