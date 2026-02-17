import ws from "k6/ws";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

// Custom metrics
const cursorSyncLatency = new Trend("cursor_sync_latency", true); // milliseconds
const objectSyncLatency = new Trend("object_sync_latency", true);
const wsConnecting = new Trend("ws_connecting", true);
const successRate = new Rate("successful_checks");

export const options = {
  scenarios: {
    // Scenario 1: MVP target load (20 users, 1 minute)
    mvp_load: {
      executor: "constant-vus",
      vus: 20,
      duration: "1m",
      tags: { scenario: "mvp" },
    },
    // Scenario 2: Scale target (ramp to 50 users over 2 minutes)
    scale_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      startTime: "90s", // Start after mvp_load settles
      tags: { scenario: "scale" },
    },
  },
  thresholds: {
    // P95 cursor sync under 50ms
    cursor_sync_latency: ["p(95)<50"],
    // P95 object sync under 100ms
    object_sync_latency: ["p(95)<100"],
    // P95 WebSocket connection time under 500ms
    ws_connecting: ["p(95)<500"],
    // 99% of checks must pass
    successful_checks: ["rate>0.99"],
  },
};

const BOARD_ID = __ENV["BOARD_ID"] || "load-test-board";
const BASE_URL = __ENV["BASE_URL"] || "ws://localhost:8787";
const WS_URL = `${BASE_URL}/board/${BOARD_ID}`;

export default function () {
  const connectStart = Date.now();

  const res = ws.connect(WS_URL, {}, function (socket) {
    const connectTime = Date.now() - connectStart;
    wsConnecting.add(connectTime);

    socket.on("open", () => {
      successRate.add(check(connectTime, {
        "WebSocket connected in <500ms": (t) => t < 500,
      }));

      let messageCount = 0;

      // Send messages at ~10/second
      const interval = socket.setInterval(() => {
        messageCount++;
        const sentAt = Date.now();

        if (messageCount % 10 === 0) {
          // Every 10th message is an object update (heavier sync)
          socket.send(JSON.stringify({
            type: "object_update",
            boardId: BOARD_ID,
            objectId: `obj-${__VU}`,
            sentAt,
            payload: {
              x: Math.random() * 1000,
              y: Math.random() * 800,
              width: 100 + Math.random() * 200,
              height: 50 + Math.random() * 150,
              version: messageCount,
            },
          }));
        } else {
          // Cursor position update
          socket.send(JSON.stringify({
            type: "cursor_move",
            boardId: BOARD_ID,
            userId: `user-${__VU}`,
            sentAt,
            x: Math.random() * 1920,
            y: Math.random() * 1080,
          }));
        }
      }, 100); // 100ms = 10 messages/second

      // Listen for echoed messages to measure round-trip latency
      socket.on("message", (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.sentAt) {
            const latency = Date.now() - msg.sentAt;
            if (msg.type === "cursor_move") {
              cursorSyncLatency.add(latency);
              successRate.add(check(latency, {
                "cursor latency <50ms": (l) => l < 50,
              }));
            } else if (msg.type === "object_update") {
              objectSyncLatency.add(latency);
              successRate.add(check(latency, {
                "object latency <100ms": (l) => l < 100,
              }));
            }
          }
        } catch {
          // Ignore non-JSON messages
        }
      });

      // Run for 30 seconds per VU
      sleep(30);
      socket.clearInterval(interval);
      socket.close();
    });

    socket.on("error", (e) => {
      successRate.add(false);
      console.error(`WebSocket error: ${JSON.stringify(e)}`);
    });
  });

  check(res, {
    "WebSocket status 101": (r) => r && r.status === 101,
  });
}
