import Fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health";
import { loggerConfig, startupLogger } from "./logger";
import { initializeTelemetry, registerCorrelationHooks } from "./telemetry";

const SERVICE_NAME = "__SERVICE_NAME__";

export function buildApp(): FastifyInstance {
  initializeTelemetry(SERVICE_NAME);

  const app = Fastify({ logger: loggerConfig });

  registerCorrelationHooks(app);
  registerHealthRoutes(app);

  app.get("/", async () => {
    return {
      service: SERVICE_NAME,
      message: "Service is running"
    };
  });

  return app;
}

async function start(): Promise<void> {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info({ service: SERVICE_NAME, port, host }, "Server started");
}

if (require.main === module) {
  start().catch((error: unknown) => {
    const err = error instanceof Error ? error : new Error("Unknown startup error");
    startupLogger.error({ err }, "Failed to start server");
    process.exit(1);
  });
}
