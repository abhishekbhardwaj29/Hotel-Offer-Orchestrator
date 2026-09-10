export interface HotelListing {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

export interface HotelOffer {
  name: string;
  price: number;
  supplier: string;
  commissionPct: number;
}

export interface SupplierResult {
  supplier: string;
  hotels: HotelListing[];
  healthy: boolean;
  errorMessage?: string;
}

export interface WorkflowInput {
  city: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  suppliers: {
    supplierA: { reachable: boolean; latencyMs: number };
    supplierB: { reachable: boolean; latencyMs: number };
  };
  redis: { connected: boolean };
  temporal: { connected: boolean };
}
