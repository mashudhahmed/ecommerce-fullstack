// src/common/constants/bulk-limits.ts
export const BULK_LIMITS = {
  PRODUCTS: {
    MAX_BULK_UPLOAD: 100,
    MAX_BULK_DELETE: 50,
    MAX_BULK_STOCK_UPDATE: 100,
  },
  USERS: {
    MAX_BULK_DELETE: 50,
    MAX_BULK_UPDATE: 50,
  },
  ORDERS: {
    MAX_BULK_UPDATE: 50,
  },
  VENDORS: {
    MAX_BULK_ACTION: 50,
  },
} as const;

export type BulkLimitKey = keyof typeof BULK_LIMITS;