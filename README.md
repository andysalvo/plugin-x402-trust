# @elizaos/plugin-x402-trust

Evaluate trust scores of x402-enabled services from within ElizaOS agents. No API key required.

## What it does

Gives your agent the ability to assess whether an x402-enabled service is trustworthy before transacting. Checks four dimensions:

- **Reachability** -- can the service be reached, and how fast does it respond?
- **x402 Compliance** -- does it implement the x402 payment protocol correctly?
- **Service Quality** -- how many endpoints, documentation coverage, pricing clarity
- **Governance** -- social signals (website, X/Twitter), metadata (agent.json, openapi.json)

Returns an overall score (0-100) and a recommendation: PROCEED, CAUTION, HIGH RISK, or DO NOT TRANSACT.

## Install

```bash
npm install @elizaos/plugin-x402-trust
```

## Usage

```typescript
import { x402TrustPlugin } from "@elizaos/plugin-x402-trust";

// Add to your agent's character config
const character = {
  // ...
  plugins: [x402TrustPlugin],
};
```

## Action: EVALUATE_SERVICE

Triggered when a user asks to evaluate, check, or assess a service URL.

**Example prompts:**
- "Evaluate the trust score for https://api.example.com"
- "Is https://mcp.someservice.com safe to transact with?"
- "Check the trust of https://relay.payments.io"

**Response:** Formatted trust report with scores, details, and recommendation.

## Provider: x402-trust-score

Automatically enriches agent context with trust score data when a URL is mentioned in conversation. Exposes structured values:

- `overallScore`, `recommendation`
- `reachability`, `x402Compliance`, `serviceQuality`, `governance`
- `network`, `facilitator`

## No API key required

This plugin calls the public evaluation endpoint at `x402.asalvocreative.com`. No authentication needed.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
