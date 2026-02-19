import pino from "pino";
import type { FastifyServerOptions } from "fastify";
import { getCorrelationId } from "./telemetry";

const baseLoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: "message",
  mixin() {
    const correlationId = getCorrelationId();
    return correlationId ? { correlationId } : {};
  }
};

export const loggerConfig: FastifyServerOptions["logger"] = baseLoggerOptions;
export const startupLogger = pino(baseLoggerOptions);
