import type {
  Provider,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import type { TrustResponse, TrustResult } from "../types.js";

const EVALUATE_URL = "https://x402.asalvocreative.com/tools/evaluate";

function extractUrl(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s"'<>]+/i;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}

export const trustScoreProvider: Provider = {
  name: "x402-trust-score",

  description:
    "Provides x402 trust score data for services mentioned in conversation. Returns reachability, compliance, quality, and governance scores.",

  dynamic: true,

  get: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
  ) => {
    const text = message.content?.text;
    if (!text) {
      return { text: "No trust score data available (no message text)." };
    }

    const url = extractUrl(text);
    if (!url) {
      return { text: "No trust score data available (no URL detected)." };
    }

    try {
      const endpoint = `${EVALUATE_URL}?server_url=${encodeURIComponent(url)}`;
      const res = await fetch(endpoint);

      if (!res.ok) {
        return {
          text: `Trust score unavailable for ${url} (HTTP ${res.status}).`,
        };
      }

      const data: TrustResponse = await res.json();

      if (!data.results || data.results.length === 0) {
        return { text: `No trust data found for ${url}.` };
      }

      const result: TrustResult = data.results[0];

      return {
        values: {
          serviceUrl: url,
          overallScore: result.overall,
          recommendation: result.recommendation,
          reachability: result.scores.reachability,
          x402Compliance: result.scores.x402_compliance,
          serviceQuality: result.scores.service_quality,
          governance: result.scores.governance,
          network: result.network,
          facilitator: result.facilitator,
        },
        data: {
          fullResult: result,
          methodology: data.methodology,
          generated: data.generated,
        },
        text: `Trust score for ${result.name} (${url}): ${result.overall}/100 - ${result.recommendation}. Reachability: ${result.scores.reachability}, x402 Compliance: ${result.scores.x402_compliance}, Service Quality: ${result.scores.service_quality}, Governance: ${result.scores.governance}.`,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error";
      return { text: `Failed to fetch trust score for ${url}: ${errMsg}` };
    }
  },
};
