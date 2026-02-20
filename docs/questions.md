# Repository Interview Question Bank

## Topics

- Architecture & system design (CLI-first IDP, layering, extension model)
- Technology & tooling choices (Node/TypeScript, Fastify, Vitest, ESLint, Docker)
- Code structure & implementation patterns (deterministic generation, placeholder replacement, file classification)
- DevSecOps & supply chain controls (CI coverage gates, dependency hygiene, container hardening)
- Reliability & testing strategy (health/ready semantics, failure modes, unit/integration boundaries)
- Observability & telemetry (correlation IDs, AsyncLocalStorage, OpenTelemetry bootstrap)
- Progressive delivery & deployment model (pipeline stages, release/rollback posture)
- Governance & risk (platform guardrails, template change control, AI policy where applicable)
- Scalability & performance (event loop behavior, tracing overhead, template growth)
- Cost & operational tradeoffs (telemetry volume, CI/runtime cost, baseline vs flexibility)

## 1. Architecture & System Design

1. The repo explicitly separates CLI, generator, and templates. What specific coupling risks does this layering avoid, and where does coupling still leak through (e.g., placeholder tokens, workflow paths, template directory layout)?
2. The generator enforces deterministic output via sorted directory reads and newline normalization. What problem is this solving in a multi-team org, and what are the tradeoffs (e.g., hiding platform drift, masking OS-specific diffs, performance overhead)?
3. How would you evolve this “lite” IDP into a multi-template, multi-language generator without turning the codebase into an unmaintainable templating engine?
4. The architecture document suggests “template-first changes, generator second, CLI last.” Under what scenarios would you intentionally violate that order, and how would you guard against CLI/generator behavior drift from templates?
5. What is the long-term contract between the platform and service teams here: is the platform promising “support forever” for the generated skeleton, or only at generation time? How do you operationalize that contract?
6. If a service is generated today and the platform updates its template tomorrow, what is your strategy for propagating updates safely to existing services (migration tooling, codemods, patch releases, or “no backports”)?
7. Where would you encode platform policies that aren’t purely file templates (e.g., “all services must expose /ready semantics tied to dependencies”): generator logic, template code, CI, or external policy-as-code?
8. The generator requires an empty target directory. Why is that the right safety posture, and what “real-world” workflows does it block (incremental regeneration, partial updates, patching existing repos)?
9. How would you support monorepo and polyrepo modes with the same CLI while preserving determinism and avoiding surprise overwrites?
10. What is the threat model for running this generator on a developer laptop vs in CI? Where do you place trust boundaries (template sources, npm dependencies, filesystem permissions)?
11. The repo includes a demo generated service checked in. What architectural decision does that represent (golden sample vs test fixture vs marketing artifact), and how do you keep it from going stale?
12. If your organization mandates internal platform APIs (service registry, artifact repository, secrets), how would you integrate those without adding “portal/control-plane” scope creep?
13. How do you decide what belongs in the platform baseline vs what should remain team choice? Give a principled rubric (risk, cross-team support burden, compliance, operability).
14. The current baseline includes telemetry bootstrap and correlation IDs. What additional cross-cutting concerns are “minimum viable” for production readiness (rate limiting, auth, config validation, graceful shutdown), and why were they excluded here?
15. If this tool becomes widely used, what happens when template generation fails mid-run (partial directory writes)? How would you design atomicity and rollback for filesystem generation?
16. How would you version the platform itself (CLI versioning, template versioning, and generated service versioning), and how would you allow services to declare “I was generated from baseline X”? 
17. What extension points do you intentionally expose for service teams (hooks, plugin architecture, template variables), and which do you intentionally not expose to preserve guardrails?
18. If a team needs a non-Fastify runtime or different telemetry stack, what’s your “yes, but” strategy that preserves platform consistency without blocking delivery?

## 2. Technology & Tooling Choices

1. Why choose a CLI-first approach (commander + filesystem generation) over Backstage or a portal-driven experience? What are the key adoption and maintenance tradeoffs?
2. The CLI is implemented in TypeScript and compiled to CommonJS. Why CommonJS here, and what are the implications for Node 20+, ESM ecosystems, and downstream packaging?
3. The generator uses simple token replacement rather than a real templating engine. What classes of bugs does this avoid, and what expressiveness does it prevent?
4. Why Fastify 5 for the service baseline? What do you gain relative to Express or NestJS, and what new failure modes or operational concerns does it introduce?
5. The template uses Pino for structured logging. Why not rely solely on Fastify’s defaults, and how do you validate log schema consistency across services?
6. The repo uses OpenTelemetry API + SDK trace provider, but no exporter is configured. What’s the rationale for “bootstrap only,” and how do you avoid a false sense of observability readiness?
7. Vitest is used for tests and coverage thresholds are set at 70%. Why 70%, and how do you prevent teams from gaming coverage while still keeping it meaningful?
8. The Dockerfile is multi-stage but still uses `node:20-alpine` throughout. Why Alpine, and what compatibility/security tradeoffs come with musl vs glibc in Node ecosystems?
9. The CI pipeline is GitHub Actions with a single job. What would justify splitting jobs (lint/test/build/docker) and what would you lose (simplicity, caching reliability)?
10. The workflow pins major versions of actions (`@v4`) rather than commit SHAs. What is your supply-chain stance on pinning, and how do you operationalize upgrades safely?
11. The runtime expects `PORT` and `HOST`. Why not standardize configuration management (dotenv, schema validation), and how do you handle misconfiguration errors at startup?
12. Why use AsyncLocalStorage for correlation IDs vs explicit request-scoped logging contexts? Discuss correctness under async boundaries and performance overhead.

## 3. Code Structure & Implementation Patterns

1. Walk through `generateService` end-to-end. What invariants does it enforce, and which assumptions could break on different OS/filesystem behaviors?
2. The generator defines `SERVICE_NAME_PATTERN` and validates kebab-case-ish names. Why this regex, and what naming requirements are missing (length limits, reserved words, org policies)?
3. The code explicitly skips certain directories (e.g., `node_modules`, `dist`) while copying templates. Under what conditions could this skip list be wrong or dangerous?
4. `copyDirectoryWithReplacement` skips the `ci` directory only at depth 0 and then writes the workflow separately. Why is CI treated specially, and what breaks if templates want multiple workflows or additional GitHub metadata?
5. Placeholder replacement is implemented via repeated `split().join()`. What are the performance characteristics for large templates, and what are the correctness risks (token collisions, accidental replacements)?
6. The generator normalizes CRLF to LF for text output. How does that interact with Windows developers, git autocrlf settings, and tooling that expects platform-native newlines?
7. `isTextFile` uses extension allow/deny plus a NUL-byte scan. What files could be misclassified (e.g., protobufs, wasm, minified JS, UTF-16), and how would you harden this classification?
8. The generator uses `fs.readdir({ withFileTypes: true })` and sorts names lexicographically. How do you guarantee stable ordering across locales/case sensitivity?
9. The CLI catches errors and sets `process.exitCode` rather than calling `process.exit`. Why is that good practice, and where can it still cause subtle bugs in async flows?
10. In the service template, telemetry is “initialized” every time `buildApp()` runs, but guarded by a module-level flag. What are the testability and multi-app-instance implications of this pattern?
11. The correlation ID is set in an `onRequest` hook and applied to tracing in `preHandler`. Why these hook points, and what edge cases exist (early errors, stream responses, plugin hooks)?
12. The logger mixin pulls correlation ID from AsyncLocalStorage. How do you ensure log lines emitted outside the request lifecycle (startup, background jobs) still have meaningful context?
13. The `/ready` endpoint always returns ready. What code-level changes would you make to support real readiness (dependency checks, warm-up state), and how would you keep it deterministic across environments?
14. The Docker runtime stage runs `npm ci --omit=dev` inside the image. What are the security and reproducibility tradeoffs vs copying a pre-built `node_modules` or using `npm prune`?

## 4. DevSecOps & Supply Chain Controls

1. The CI workflow runs lint/test/coverage/build/docker build. What security checks are missing for a production baseline (SAST, dependency scanning, container scanning, secret scanning), and how would you add them without slowing teams to a crawl?
2. What is your approach to SBOM generation and artifact attestation (SLSA provenance) for the built Docker image, and where would that live in the template?
3. How would you handle npm dependency risk (lockfile review, `npm audit` policies, allowlists/denylists), especially given that this is a platform-generated baseline?
4. The Dockerfile uses `node:20-alpine` without a digest pin. What’s your policy on base image pinning, and how do you monitor and roll out CVE fixes across many generated services?
5. The container runs as the default user. What hardening steps would you require (non-root, read-only filesystem, dropped capabilities), and what app changes might that force?
6. How do you prevent template tampering (malicious changes to `src/templates/service/**`) and ensure change control (CODEOWNERS, protected branches, signed commits)?
7. What’s your policy on secrets and configuration in the generated service (no `.env` by default, env var conventions, secret scanning)?
8. How would you integrate policy-as-code (e.g., verifying a service includes required endpoints, logging schema, OTel hooks) at PR time?
9. The generator writes `.github/workflows/ci.yml` into generated repos. How do you ensure org-wide GitHub Actions restrictions (allowed actions, runners, permissions) are compatible with the template?
10. What are your minimum expectations for dependency update automation (Renovate/Dependabot) and how do you keep it consistent across generated services?
11. If a team disables lint/coverage gates “temporarily,” how do you detect and prevent baseline erosion across the fleet?

## 5. Reliability & Testing Strategy

1. The template provides health and readiness endpoints. What reliability contract do those endpoints represent, and how do you ensure teams implement them correctly rather than as placeholders?
2. The only test in the scaffold validates `/health`. Why is that a reasonable minimum, and what additional tests would you mandate for production services (routing, error handling, telemetry, logging)?
3. How do you design tests to validate correlation ID behavior end-to-end (header propagation, log enrichment, trace attributes) without coupling tests too tightly to implementation details?
4. What is the expected boundary between unit tests and integration tests in this baseline? Would you include contract tests, dockerized tests, or ephemeral environments?
5. Coverage thresholds are uniform. How do you handle services with different risk profiles (Tier 1 vs Tier 3) and avoid one-size-fits-all gates?
6. The runbook suggests “roll back to previous known-good image.” Where is the rollback mechanism actually defined (registry tags, deployment system), and how do you test it?
7. The server startup logs “Server started” after listen. What reliability events are missing (graceful shutdown, SIGTERM handling, startup validation, dependency warm-up)?
8. How would you ensure the service fails fast on misconfiguration rather than running in a degraded state?
9. How do you simulate and test failure modes called out in the runbook (timeouts, elevated error rates after deployment) in a repeatable way?
10. How would you incorporate chaos or fault injection practices into an IDP-lite model without adding heavy platform overhead?

## 6. Observability & Telemetry

1. The template uses OpenTelemetry’s `NodeTracerProvider` with `provider.register()` but no exporters. What is the intended telemetry path (stdout, OTLP, vendor agent), and how do you ensure teams don’t ship “no-op tracing” to production unknowingly?
2. How do you decide what fields belong in logs by default (service name, correlationId, environment, version, request IDs) and how do you enforce schema stability over time?
3. The correlation ID is sourced from `x-correlation-id` or generated. What is your stance on trusting client-provided correlation IDs, and how would you mitigate abuse (injection, cardinality explosion, log forging)?
4. AsyncLocalStorage is used to store correlation ID. What are the known edge cases in Node async context propagation (timers, async boundaries, third-party libraries), and how do you validate correctness at scale?
5. What is your plan for metrics (request counts, latency histograms, error rates)? Why is metrics not included in this baseline, and when should it be?
6. How would you implement distributed tracing context propagation (W3C traceparent) in the Fastify pipeline, and what tradeoffs exist vs relying on instrumentation libraries?
7. The template sets a trace attribute `correlation.id`. Why that name, and how do you map it to vendor conventions (e.g., trace IDs, request IDs) to support cross-service debugging?
8. What is your sampling strategy for tracing, and how do you prevent telemetry cost blowups while preserving debuggability during incidents?
9. How would you ensure that the logs emitted at startup/shutdown still correlate to deployments (build SHA, image tag, baseline version)?

## 7. Progressive Delivery & Deployment Model

1. The generated CI validates build quality and docker build, but it doesn’t publish artifacts. What is the intended delivery model (separate CD pipeline, GitOps, manual promotion), and why?
2. What additional stages would you consider mandatory for production (image push, vulnerability scan, deploy to staging, smoke tests), and where should they live (template CI vs org pipeline)?
3. How do you model environment-specific configuration (dev/stage/prod) for generated services while keeping the scaffold minimal and secure?
4. The runbook references rollback but doesn’t define rollback automation. How do you ensure rollback is not just aspirational documentation?
5. What is your approach to progressive delivery techniques (canary, blue/green, feature flags) in a “lite” platform that intentionally avoids control planes?
6. How do you prevent drift between the CI workflow template and organizational standards over time (centralized reusable workflows vs per-service copies)?
7. How do you handle breaking changes in CI policy (e.g., higher coverage thresholds) across existing generated services?
8. If a service needs additional build steps (codegen, OpenAPI generation), where should that customization live without forking the template?
9. What is your strategy for managing GitHub Actions permissions, tokens, and least privilege in the generated workflow?

## 8. Governance & Risk (AI-specific if relevant)

1. This repo is a platform baseline generator. Who owns the baseline, who can approve changes, and how do you prevent “drive-by” edits from weakening guardrails?
2. What governance mechanisms ensure that template updates are reviewed for security and operational impact (ADRs, design reviews, threat modeling)?
3. The generated service includes ADR/SLO/Runbook templates. How do you ensure teams actually fill these in, and what enforcement is appropriate vs trust?
4. What is your policy for exceptions (a team wants to drop OTel, lower coverage, change runtime)? How are exceptions recorded, time-bounded, and audited?
5. How do you model “platform maturity” metrics for this IDP (adoption rate, lead time improvements, incident reduction) without building a portal?
6. If AI-assisted coding tools are used (e.g., Copilot), what governance do you require for template changes (prompt logging, code review rigor, provenance), and how do you mitigate IP/security risks?
7. How would you handle regulated workloads (PII, PCI) with this baseline: what additional controls and artifacts become mandatory (data classification, audit logs, retention policies)?
8. What is the deprecation policy for template features (e.g., changing correlation header name, upgrading major framework versions), and how do you communicate and enforce it?
9. How do you prevent “template sprawl” (too many variants) while still meeting legitimate domain needs (public API service vs internal worker)?

## 9. Scalability & Performance

1. Scenario: 10k RPS service with strict latency SLO. What overhead does AsyncLocalStorage introduce, and how would you benchmark and decide whether to keep it?
2. Scenario: A service is deployed with tracing enabled at 100% sampling. What failure modes and cost impacts do you expect, and what safeguards would you implement?
3. Scenario: Clients send unique `x-correlation-id` values per request (high cardinality). How does that affect logs/traces, and what guardrails would you add?
4. Scenario: The template grows to thousands of files across multiple services. What are the performance characteristics of the current copy/replace approach, and what optimizations would you consider?
5. Scenario: Windows and Linux developers generate services and see noisy diffs. How do you eliminate cross-platform nondeterminism (EOL, file modes, path separators) and keep git history clean?
6. Scenario: A plugin adds binary assets not covered by the binary extension set. How could the generator corrupt them, and what detection/prevention strategy would you use?
7. Scenario: Multiple `buildApp()` instances are created in the same process (tests, serverless, multi-tenant). How does the telemetry initialization pattern behave, and what refactor would you propose?
8. Scenario: Readiness should reflect downstream dependencies (DB, queue). How do you implement readiness without creating synchronous bottlenecks or cascading failures?
9. Scenario: You need graceful shutdown under Kubernetes with a 30s termination grace period. What changes do you need in app code and Docker/container configuration?
10. Scenario: You need request timeouts and backpressure. Where do you implement it (Fastify settings, reverse proxy, app middleware), and how do you test it?

## 10. Cost & Operational Tradeoffs

1. What is the incremental cost of “observability by default” (logs + traces) at scale, and how do you design default sampling and log levels to avoid budget surprises?
2. CI includes lint/test/coverage/build/docker build on every PR. How do you balance fast feedback with compute cost, and what would you cache or parallelize?
3. The runtime image installs prod dependencies during build. What is the tradeoff between smaller image sizes vs reproducible builds and faster deploys?
4. How do you decide which baseline checks are mandatory vs optional, and how do you quantify the cost of each guardrail?
5. What operational toil does this platform reduce (onboarding, incident response), and how do you measure ROI credibly?
6. If you introduce security scanning (SAST, container scan), what’s your strategy to avoid alert fatigue and “security theater”?

## 11. Consulting & Leadership Framing

1. Explain this platform to a VP of Engineering in 2 minutes: what business problem it solves, what it deliberately does not solve, and how success is measured.
2. If a product team says “this baseline slows us down,” how do you diagnose whether it’s a platform issue, a workflow issue, or a perception issue?
3. How do you build a coalition of early adopters for an IDP-lite approach without a portal or centralized enforcement?
4. Describe your approach to negotiating a golden path: who gets a vote, how you handle dissent, and how you avoid lowest-common-denominator outcomes.
5. When a production incident happens in a generated service, what is the platform team’s responsibility vs the service team’s? How do you avoid “platform as a scapegoat” dynamics?
6. How do you structure change management for baseline updates (communication, migration guidance, deprecation windows) so teams trust the platform?
7. Present a consulting-style risk assessment: what are the top 5 risks in shipping this baseline org-wide, and what mitigations you would propose.
8. How do you ensure the platform doesn’t become a bottleneck as adoption grows (support model, docs, self-service, templates)?
9. How do you decide between “opinionated baseline” and “configurable framework” as the platform matures?
10. If you had to justify this platform to security/compliance stakeholders, what evidence would you present (controls, audits, logs, approvals)?

## 12. Hard Panel Questions

1. You claim “observability by default,” but your tracing setup doesn’t export anywhere. Isn’t that misleading? Defend the choice or propose the minimal change to make it real.
2. Your readiness endpoint always returns ready. In production, this can cause outages. Why is this acceptable as a baseline, and what guardrail would you add to prevent misuse?
3. Your CI has no security scanning. If this is a platform reference, aren’t you institutionalizing weak security hygiene? What would you add first and why?
4. The generator refuses non-empty directories. How do teams safely apply baseline fixes to existing services without re-scaffolding from scratch?
5. Placeholder replacement uses naive string substitution. How do you prevent accidental token replacement inside binary-ish text, minified files, or user content?
6. Your binary detection relies on an extension list and a NUL scan. Show how you would test this robustly across real-world file types.
7. You rely on AsyncLocalStorage for request context. Under heavy load and complex async libraries, ALS can break in subtle ways. What is your fallback design if ALS proves unreliable?
8. Docker images run as root by default and include `npm ci` during build. What specific hardening steps would you mandate, and what is the blast radius if you don’t?
9. You vendor the CI workflow into every generated service. How do you prevent 500 services from drifting into 500 unique CI snowflakes over two years?
10. If a critical CVE hits Fastify or Node 20, how do you coordinate emergency patch rollout across all generated services, and what evidence would you provide that the fleet is remediated?

# Learning Gap Signals

- Topics the candidate must deeply understand to answer well
  - Platform engineering “golden path” design and adoption mechanics
  - Node.js runtime internals (event loop, AsyncLocalStorage behavior, shutdown semantics)
  - Deterministic code generation and reproducible builds
  - GitHub Actions design, permissions, caching, and reusable workflows
  - Supply chain security (SBOM, SLSA, dependency/container scanning, pinning strategy)
  - Observability architecture (logs/metrics/traces, OpenTelemetry exporter + sampling)
  - Service reliability patterns (health vs readiness, timeouts, graceful shutdown, backpressure)

- Areas that appear weak or under-explained
  - No explicit artifact publishing/release/deployment model beyond CI validation
  - Telemetry is “bootstrap only” with no exporter/configuration guidance
  - Readiness endpoint semantics are placeholder-level
  - Generator itself lacks a visible test suite and automated validation of generated outputs

- Areas that could trigger skepticism
  - “Production-ready” claims without security scanning, SBOM/attestations, or container hardening
  - Copying CI workflows into every service (drift risk) without an update mechanism
  - Trusting client-provided correlation IDs without documented constraints

- Missing artifacts
  - Threat model for the generator and the generated service baseline
  - Security posture documentation (dependency policy, scanning requirements, action pinning stance)
  - Release/versioning policy for templates and generated services (baseline version stamp, upgrade path)
  - Deployment/rollback strategy beyond a runbook sentence (who/what performs rollback)
  - Operational SLO enforcement guidance (how SLIs are measured, dashboards/alerts integration)
