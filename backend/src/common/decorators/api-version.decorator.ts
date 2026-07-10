// src/common/decorators/api-version.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const API_VERSION = 'api_version';
export const ApiVersion = (version: string) => SetMetadata(API_VERSION, version);