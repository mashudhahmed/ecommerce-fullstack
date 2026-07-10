// src/files/files.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { MulterFile } from '../common/types/multer-file.type';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = configService.get('upload.directory') || './uploads';
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: MulterFile): Promise<{ url: string; filename: string }> {
    try {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/\s+/g, '_');
      const filename = `${timestamp}-${safeName}`;
      const filePath = path.join(this.uploadDir, filename);

      await fs.writeFile(filePath, file.buffer);

      const baseUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3001';
      const url = `${baseUrl}/uploads/${filename}`;

      this.logger.log(`File uploaded: ${filename}`);
      return { url, filename };
    } catch (error: any) {
      this.logger.error(`File upload failed: ${error.message}`);
      throw new BadRequestException('File upload failed');
    }
  }
}