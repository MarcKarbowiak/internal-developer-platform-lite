# Service Level Objectives: __SERVICE_NAME__

Last updated: __GENERATED_DATE_ISO__

## Service Overview

- Service: __SERVICE_NAME__
- Owner: Team __SERVICE_NAME_PASCAL__
- Tier: Define tier (e.g., Tier 1 / Tier 2)

## SLI Definitions

1. Availability SLI
- Definition: Successful HTTP responses for valid requests
- Measurement: `successful_requests / total_requests`

2. Latency SLI
- Definition: Request latency at P95
- Measurement window: 28-day rolling

## SLO Targets

- Availability SLO: 99.9% over 28 days
- Latency SLO: P95 < 300ms over 28 days

## Error Budget Policy

- Burn alert threshold: 5% budget consumed in 24h
- Escalation: Notify on-call and service owner
- Freeze policy: Feature rollouts paused when budget is exhausted

## Alerting and Dashboards

- Alert channel: Define paging target
- Dashboard URL: Add primary dashboard link
- Runbook URL: `docs/runbook.md`