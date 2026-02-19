import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { context, trace } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

const correlationIdStore = new AsyncLocalStorage<string>();
let telemetryInitialized = false;

export function initializeTelemetry(serviceName: string): void {
  if (telemetryInitialized) {
    return;
  }

  const provider = new NodeTracerProvider();
  provider.register();

  trace.getTracer(serviceName);
  telemetryInitialized = true;
}

export function registerCorrelationHooks(app: FastifyInstance): void {
  app.addHook("onRequest", (request: FastifyRequest, reply: FastifyReply, done) => {
    const header = request.headers["x-correlation-id"];
    const headerValue = Array.isArray(header) ? header.find((value) => value.length > 0) : header;
    const correlationId = headerValue ?? randomUUID();

    reply.header("x-correlation-id", correlationId);

    correlationIdStore.run(correlationId, () => {
      done();
    });
  });

  app.addHook("preHandler", (_request, _reply, done) => {
    const span = trace.getSpan(context.active());
    const correlationId = getCorrelationId();

    if (span && correlationId) {
      span.setAttribute("correlation.id", correlationId);
    }

    done();
  });
}

export function getCorrelationId(): string | undefined {
  return correlationIdStore.getStore();
}
