import type { Plugin } from "@elizaos/core";
import { evaluateServiceAction } from "./actions/evaluateService.js";
import { trustScoreProvider } from "./providers/trustScoreProvider.js";

export const x402TrustPlugin: Plugin = {
  name: "x402-trust",
  description:
    "Evaluate trust scores of x402-enabled services. Checks reachability, x402 compliance, service quality, and governance. No API key required -- pays via x402.",
  actions: [evaluateServiceAction],
  providers: [trustScoreProvider],
};

export default x402TrustPlugin;
export { evaluateServiceAction } from "./actions/evaluateService.js";
export { trustScoreProvider } from "./providers/trustScoreProvider.js";
export type {
  TrustScores,
  TrustDetails,
  TrustResult,
  TrustResponse,
  Recommendation,
} from "./types.js";
