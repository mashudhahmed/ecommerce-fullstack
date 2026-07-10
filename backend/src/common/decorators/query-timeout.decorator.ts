// src/common/decorators/query-timeout.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const QUERY_TIMEOUT = 'query_timeout';
export const QueryTimeout = (ms: number = 30000) => SetMetadata(QUERY_TIMEOUT, ms);