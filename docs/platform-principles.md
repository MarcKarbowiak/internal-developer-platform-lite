# Platform Principles

## Golden Path First

The platform optimizes for the common case: creating a service that is operable, testable, and deployable immediately. Teams should get a strong default with minimal decisions upfront.

## Guardrails Over Guidelines

Best practices are encoded in generated artifacts instead of written as optional recommendations. CI checks, strict TypeScript, and observability hooks are scaffolded by default.

## Observability by Default

Every generated service starts with structured logging, correlation IDs, and OpenTelemetry bootstrap support. This reduces mean time to diagnose incidents and standardizes telemetry quality.

## Docs-First Operations

Operational documentation is part of the scaffold, not an afterthought. ADR, SLO, and runbook templates are generated alongside code.

## Keep It Lite

This implementation intentionally excludes portal/UI layers and control planes. The focus is a practical, low-friction CLI workflow that demonstrates platform engineering value quickly.

## Deterministic Output

Given the same input, generation should be predictable and consistent. Stable file ordering and newline normalization keep diffs clean and reproducible.