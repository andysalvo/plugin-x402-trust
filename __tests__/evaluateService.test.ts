import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateServiceAction } from "../src/actions/evaluateService.js";
import type {
  Memory,
  IAgentRuntime,
  Content,
  ActionResult,
} from "@elizaos/core";

function mockMemory(text: string): Memory {
  return {
    entityId: "user-1" as any,
    roomId: "room-1" as any,
    content: { text } as Content,
  } as Memory;
}

const mockRuntime = {} as IAgentRuntime;

describe("EVALUATE_SERVICE action", () => {
  describe("metadata", () => {
    it("has correct name", () => {
      expect(evaluateServiceAction.name).toBe("EVALUATE_SERVICE");
    });

    it("has description", () => {
      expect(evaluateServiceAction.description).toBeTruthy();
      expect(evaluateServiceAction.description.length).toBeGreaterThan(10);
    });

    it("has examples", () => {
      expect(evaluateServiceAction.examples).toBeDefined();
      expect(evaluateServiceAction.examples!.length).toBeGreaterThan(0);
    });

    it("has similes", () => {
      expect(evaluateServiceAction.similes).toBeDefined();
      expect(evaluateServiceAction.similes!.length).toBeGreaterThan(0);
    });
  });

  describe("validate", () => {
    it("returns true when message contains a URL", async () => {
      const msg = mockMemory("Evaluate https://api.example.com");
      const result = await evaluateServiceAction.validate(mockRuntime, msg);
      expect(result).toBe(true);
    });

    it("returns false when message has no URL", async () => {
      const msg = mockMemory("Evaluate some service");
      const result = await evaluateServiceAction.validate(mockRuntime, msg);
      expect(result).toBe(false);
    });

    it("returns false when message text is empty", async () => {
      const msg = mockMemory("");
      const result = await evaluateServiceAction.validate(mockRuntime, msg);
      expect(result).toBe(false);
    });

    it("handles http URLs", async () => {
      const msg = mockMemory("Check http://example.com/api");
      const result = await evaluateServiceAction.validate(mockRuntime, msg);
      expect(result).toBe(true);
    });
  });

  describe("handler", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("calls the evaluate API with the extracted URL", async () => {
      const mockResponse = {
        generated: "2026-03-18T00:00:00Z",
        methodology: "v2 test",
        results: [
          {
            api_id: "1",
            name: "Test Service",
            description: "A test service",
            network: "base",
            supported_networks: ["base"],
            facilitator: "relai",
            x402_version: 2,
            website_url: null,
            x_url: null,
            z_auth_enabled: false,
            total_endpoints: 3,
            enabled_endpoints: 3,
            scores: {
              reachability: 100,
              x402_compliance: 90,
              service_quality: 85,
              governance: 70,
            },
            details: {
              reachability: "All endpoints respond (avg 50ms)",
              x402_compliance: "Valid x402 payment header present",
              service_quality: "3 endpoints, documented",
              governance: "Has website",
            },
            overall: 86,
            recommendation: "PROCEED" as const,
            price_range: "$0.001-$0.01",
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const msg = mockMemory("Evaluate https://api.test.com");
      const callbackResults: Content[] = [];
      const callback = async (content: Content) => {
        callbackResults.push(content);
        return [] as any;
      };

      const result = (await evaluateServiceAction.handler(
        mockRuntime,
        msg,
        undefined,
        undefined,
        callback,
      )) as ActionResult;

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "server_url=" + encodeURIComponent("https://api.test.com"),
        ),
      );
      expect(callbackResults.length).toBe(1);
      expect(callbackResults[0].text).toContain("Test Service");
      expect(callbackResults[0].text).toContain("86");
      expect(callbackResults[0].text).toContain("PROCEED");
    });

    it("returns action result with score data", async () => {
      const mockResponse = {
        generated: "2026-03-18T00:00:00Z",
        methodology: "v2",
        results: [
          {
            api_id: "1",
            name: "Scored Service",
            description: "test",
            network: "base",
            supported_networks: ["base"],
            facilitator: "relai",
            x402_version: 2,
            website_url: null,
            x_url: null,
            z_auth_enabled: false,
            total_endpoints: 1,
            enabled_endpoints: 1,
            scores: {
              reachability: 90,
              x402_compliance: 80,
              service_quality: 70,
              governance: 60,
            },
            details: {
              reachability: "OK",
              x402_compliance: "OK",
              service_quality: "OK",
              governance: "OK",
            },
            overall: 75,
            recommendation: "CAUTION" as const,
            price_range: "N/A",
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const msg = mockMemory("Check https://api.scored.com");
      const result = (await evaluateServiceAction.handler(
        mockRuntime,
        msg,
      )) as ActionResult;

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.overall).toBe(75);
      expect(result.data!.recommendation).toBe("CAUTION");
    });

    it("handles API errors gracefully", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const msg = mockMemory("Evaluate https://api.broken.com");
      const callbackResults: Content[] = [];
      const callback = async (content: Content) => {
        callbackResults.push(content);
        return [] as any;
      };

      const result = (await evaluateServiceAction.handler(
        mockRuntime,
        msg,
        undefined,
        undefined,
        callback,
      )) as ActionResult;

      expect(result.success).toBe(false);
      expect(callbackResults[0].text).toContain("500");
    });

    it("handles network failures gracefully", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Network unreachable"),
      );

      const msg = mockMemory("Evaluate https://api.offline.com");
      const callbackResults: Content[] = [];
      const callback = async (content: Content) => {
        callbackResults.push(content);
        return [] as any;
      };

      const result = (await evaluateServiceAction.handler(
        mockRuntime,
        msg,
        undefined,
        undefined,
        callback,
      )) as ActionResult;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network unreachable");
    });

    it("returns failure when no URL in message", async () => {
      const msg = mockMemory("evaluate something");
      const callbackResults: Content[] = [];
      const callback = async (content: Content) => {
        callbackResults.push(content);
        return [] as any;
      };

      const result = (await evaluateServiceAction.handler(
        mockRuntime,
        msg,
        undefined,
        undefined,
        callback,
      )) as ActionResult;

      expect(result.success).toBe(false);
      expect(callbackResults[0].text).toContain("URL");
    });
  });
});
