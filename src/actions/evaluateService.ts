import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  HandlerOptions,
  Content,
} from "@elizaos/core";
import type { TrustResponse } from "../types.js";

const EVALUATE_URL = "https://x402.asalvocreative.com/tools/evaluate";

function extractUrl(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s"'<>]+/i;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}

function formatResult(response: TrustResponse): string {
  if (!response.results || response.results.length === 0) {
    return "No results returned from evaluation.";
  }

  const lines: string[] = [];

  for (const r of response.results) {
    lines.push(`## ${r.name}`);
    lines.push(`**Overall Score:** ${r.overall}/100 -- ${r.recommendation}`);
    lines.push(
      `**Network:** ${r.network} | **Facilitator:** ${r.facilitator} | **x402 v${r.x402_version}**`,
    );
    lines.push("");
    lines.push("| Category | Score | Detail |");
    lines.push("|----------|-------|--------|");
    lines.push(
      `| Reachability | ${r.scores.reachability} | ${r.details.reachability} |`,
    );
    lines.push(
      `| x402 Compliance | ${r.scores.x402_compliance} | ${r.details.x402_compliance} |`,
    );
    lines.push(
      `| Service Quality | ${r.scores.service_quality} | ${r.details.service_quality} |`,
    );
    lines.push(
      `| Governance | ${r.scores.governance} | ${r.details.governance} |`,
    );
    lines.push("");
    if (r.price_range && r.price_range !== "N/A") {
      lines.push(`**Price range:** ${r.price_range}`);
    }
    if (r.total_endpoints) {
      lines.push(
        `**Endpoints:** ${r.enabled_endpoints}/${r.total_endpoints} enabled`,
      );
    }
    lines.push("");
  }

  lines.push(`_Methodology: ${response.methodology}_`);
  return lines.join("\n");
}

export const evaluateServiceAction: Action = {
  name: "EVALUATE_SERVICE",

  similes: [
    "CHECK_TRUST",
    "TRUST_SCORE",
    "EVALUATE_X402",
    "SERVICE_TRUST",
    "CHECK_SERVICE",
    "TRUST_CHECK",
  ],

  description:
    "Evaluate the trust score of an x402-enabled service. Checks reachability, x402 compliance, service quality, and governance signals. No API key required.",

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Evaluate the trust score for https://api.example.com",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "I'll evaluate that service's trust score now.",
          actions: ["EVALUATE_SERVICE"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "Can you check the trust of https://mcp.someservice.com?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Running a trust evaluation on that endpoint.",
          actions: ["EVALUATE_SERVICE"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "Is https://relay.payments.io safe to transact with?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Let me check the x402 trust score for that service.",
          actions: ["EVALUATE_SERVICE"],
        },
      },
    ],
  ],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<boolean> => {
    const text = message.content?.text;
    if (!text) return false;
    return extractUrl(text) !== null;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const text = message.content?.text;
    if (!text) {
      if (callback) {
        await callback({
          text: "I need a URL to evaluate. Please provide an x402-enabled service URL.",
        } as Content);
      }
      return { success: false, error: "No message text provided" };
    }

    const url = extractUrl(text);
    if (!url) {
      if (callback) {
        await callback({
          text: "I couldn't find a valid URL in your message. Please provide a URL like https://api.example.com",
        } as Content);
      }
      return { success: false, error: "No URL found in message" };
    }

    try {
      const endpoint = `${EVALUATE_URL}?server_url=${encodeURIComponent(url)}`;
      const res = await fetch(endpoint);

      if (!res.ok) {
        const errText = `Evaluation request failed (HTTP ${res.status}). The service at ${url} may be unreachable or the evaluation endpoint may be temporarily unavailable.`;
        if (callback) {
          await callback({ text: errText } as Content);
        }
        return { success: false, error: errText };
      }

      const data: TrustResponse = await res.json();
      const formatted = formatResult(data);

      if (callback) {
        await callback({ text: formatted } as Content);
      }

      const firstResult = data.results?.[0];
      return {
        success: true,
        text: formatted,
        data: firstResult
          ? {
              overall: firstResult.overall,
              recommendation: firstResult.recommendation,
              scores: firstResult.scores,
              url,
            }
          : { url },
      };
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      if (callback) {
        await callback({
          text: `Failed to evaluate service: ${errMsg}`,
        } as Content);
      }
      return { success: false, error: errMsg };
    }
  },
};
