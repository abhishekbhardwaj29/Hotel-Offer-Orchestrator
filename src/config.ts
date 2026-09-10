export const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  temporalAddress: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  temporalNamespace: process.env.TEMPORAL_NAMESPACE || 'default',
  temporalTaskQueue: 'hotel-offers',

  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),

  // base URLs for the mock supplier endpoints (self-referencing)
  supplierABaseUrl:
    process.env.SUPPLIER_A_URL || 'http://localhost:3000',
  supplierBBaseUrl:
    process.env.SUPPLIER_B_URL || 'http://localhost:3000',

  redisCacheTtl: parseInt(process.env.REDIS_CACHE_TTL || '300', 10),
} as const;
