#!/usr/bin/env node

import { Command } from "commander";
import { generateService, validateServiceName } from "./generators/service-generator";

const program = new Command();

program
  .name("idp-lite")
  .description("Golden-path service scaffolding CLI")
  .version("0.1.0");

program
  .command("create")
  .argument("<service-name>", "Service name (kebab-case recommended)")
  .option("--out <path>", "Output directory path (defaults to ./<service-name>)")
  .action(async (serviceName: string, options: { out?: string }) => {
    try {
      validateServiceName(serviceName);
      const outputPath = await generateService({
        serviceName,
        outDir: options.out
      });
      process.stdout.write(`Service generated at ${outputPath}\n`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      process.stderr.write(`Error: ${message}\n`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});