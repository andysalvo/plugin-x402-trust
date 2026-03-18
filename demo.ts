/**
 * Standalone demo: EVALUATE_SERVICE action against the live x402 evaluate API.
 *
 * Shows two things:
 * 1. Real x402 handshake -- the 402 payment-required flow with decoded header
 * 2. Formatted trust report -- what the action returns after payment clears
 *
 * Run: npx tsx demo.ts
 */

import { evaluateServiceAction } from "./src/actions/evaluateService.js";

const TARGET = "https://x402.asalvocreative.com";
const EVALUATE_URL = "https://x402.asalvocreative.com/tools/evaluate";

const mockRuntime = {} as any;

function mockMessage(text: string) {
  return {
    entityId: "demo-user",
    roomId: "demo-room",
    content: { text },
  } as any;
}

// Realistic trust report matching the live API response format
const MOCK_PAID_RESPONSE = {
  generated: new Date().toISOString(),
  methodology:
    "v2 -- relai.fi relay layer evaluation with recalibrated weights",
  results: [
    {
      api_id: "12",
      name: "x402 Trust Score",
      description:
        "Industry-standard trust scoring for x402 services and MCP servers",
      network: "base",
      supported_networks: ["base"],
      facilitator: "custom",
      x402_version: 2,
      website_url: "https://x402.asalvocreative.com",
      x_url: null,
      z_auth_enabled: false,
      total_endpoints: 3,
      enabled_endpoints: 3,
      scores: {
        reachability: 100,
        x402_compliance: 95,
        service_quality: 82,
        governance: 78,
      },
      details: {
        reachability: "All 3 probed endpoints respond (avg 89ms)",
        x402_compliance:
          "Valid x402 v2 payment header; Bazaar schema present; USDC on Base",
        service_quality:
          "3 endpoints enabled; pricing documented; input/output schemas defined",
        governance:
          "Has website; openapi.json present; structured-data schema.org markup",
      },
      overall: 87,
      recommendation: "PROCEED" as const,
      price_range: "$0.001-$0.005",
    },
  ],
};

async function main() {
  console.log("================================================================");
  console.log("  plugin-x402-trust  |  EVALUATE_SERVICE demo");
  console.log("================================================================");
  console.log();

  // ── Part 1: Validation ──────────────────────────────────────────────
  const msg = mockMessage(`Evaluate the trust score for ${TARGET}`);
  const valid = await evaluateServiceAction.validate(mockRuntime, msg);
  console.log(`[validate]  URL detected: ${TARGET}`);
  console.log(`[validate]  result: ${valid ? "PASS" : "FAIL"}`);
  console.log();

  // ── Part 2: Live x402 handshake ─────────────────────────────────────
  console.log("── Live x402 Handshake ──────────────────────────────────────");
  console.log(`[handler]   GET ${EVALUATE_URL}?server_url=${encodeURIComponent(TARGET)}`);

  const res = await fetch(
    `${EVALUATE_URL}?server_url=${encodeURIComponent(TARGET)}`,
  );
  console.log(`[handler]   HTTP ${res.status} ${res.status === 402 ? "(Payment Required)" : ""}`);

  if (res.status === 402) {
    const paymentHeader = res.headers.get("payment-required");
    if (paymentHeader) {
      const decoded = JSON.parse(
        Buffer.from(paymentHeader, "base64").toString(),
      );
      console.log();
      console.log(`  x402 Version:   ${decoded.x402Version}`);
      console.log(`  Network:        Base (eip155:8453)`);
      console.log(`  Asset:          USDC (${decoded.accepts[0].asset.slice(0, 10)}...)`);
      console.log(`  Amount:         ${Number(decoded.accepts[0].amount) / 1_000_000} USDC`);
      console.log(`  Pay To:         ${decoded.accepts[0].payTo}`);
      console.log(`  Description:    ${decoded.resource.description.slice(0, 80)}...`);
    }
  }
  console.log();

  // ── Part 3: Formatted trust report (post-payment) ───────────────────
  console.log("── Trust Report (post-payment result) ──────────────────────");
  console.log();

  // Simulate the handler with mock data as if payment cleared
  const callbackOutput: string[] = [];
  const callback = async (content: any) => {
    callbackOutput.push(content.text);
    return [];
  };

  // Directly call formatResult via the handler by mocking fetch
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => MOCK_PAID_RESPONSE,
    }) as Response;

  const result = await evaluateServiceAction.handler(
    mockRuntime,
    msg,
    undefined,
    undefined,
    callback,
  );

  globalThis.fetch = origFetch;

  if (callbackOutput.length > 0) {
    console.log(callbackOutput[0]);
  }

  console.log("────────────────────────────────────────────────────────────");
  console.log("ActionResult:");
  console.log(JSON.stringify(result, null, 2));
  console.log();
  console.log("================================================================");
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
