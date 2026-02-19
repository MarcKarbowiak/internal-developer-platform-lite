# Runbook: __SERVICE_NAME__

Last updated: __GENERATED_DATE_ISO__

## Service Summary

- Service: __SERVICE_NAME__
- Runtime: Node.js + Fastify
- Default port: 3000
- Health endpoints: `/health`, `/ready`

## Standard Operations

### Start locally

```bash
npm install
npm run dev
```

### Build and run

```bash
npm run build
npm run start
```

### Run tests and lint

```bash
npm run lint
npm test
npm run test:coverage
```

## Incident Triage

1. Check `/health` and `/ready` endpoints.
2. Review structured logs for `correlationId` and error records.
3. Validate recent deployment and CI status.
4. Roll back to previous known-good image if needed.

## Common Failure Modes

- Startup failure due to invalid env values
- Dependency or downstream timeout spikes
- Elevated error rate after deployment

## Escalation

- Primary on-call: Define owner
- Secondary on-call: Define backup
- Incident channel: Define comms channel