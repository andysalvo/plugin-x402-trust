export interface TrustScores {
  reachability: number;
  x402_compliance: number;
  service_quality: number;
  governance: number;
}

export interface TrustDetails {
  reachability: string;
  x402_compliance: string;
  service_quality: string;
  governance: string;
}

export type Recommendation =
  | "PROCEED"
  | "CAUTION"
  | "HIGH RISK"
  | "DO NOT TRANSACT";

export interface TrustResult {
  api_id: string;
  name: string;
  description: string;
  network: string;
  supported_networks: string[];
  facilitator: string;
  x402_version: number;
  website_url: string | null;
  x_url: string | null;
  z_auth_enabled: boolean;
  total_endpoints: number;
  enabled_endpoints: number;
  scores: TrustScores;
  details: TrustDetails;
  overall: number;
  recommendation: Recommendation;
  price_range: string;
}

export interface TrustResponse {
  generated: string;
  methodology: string;
  results: TrustResult[];
}
