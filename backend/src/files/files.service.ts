// backend/src/files/files.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { MulterFile } from '../common/types/multer-file.type';

// Only import cloudinary if available
let cloudinary: any;
let streamifier: any;

try {
  cloudinary = require('cloudinary').v2;
  streamifier = require('streamifier');
} catch {
  // Cloudinary not installed, will use local storage
  console.log('Cloudinary not installed, using local file storage');
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir: string;
  private isCloudinaryConfigured = false;

  constructor(private configService: ConfigService) {
    this.uploadDir = configService.get('upload.directory') || './uploads';
    this.ensureUploadDirectory();

    // Configure Cloudinary if available
    if (cloudinary) {
      try {
        const cloudinaryUrl =
          this.configService.get<string>('cloudinary.url') ||
          this.configService.get<string>('CLOUDINARY_URL');
        const cloudName =
          this.configService.get<string>('cloudinary.cloudName') ||
          this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey =
          this.configService.get<string>('cloudinary.apiKey') ||
          this.configService.get<string>('CLOUDINARY_API_KEY');
        const apiSecret =
          this.configService.get<string>('cloudinary.apiSecret') ||
          this.configService.get<string>('CLOUDINARY_API_SECRET');

        if (cloudinaryUrl) {
          cloudinary.config({
            cloudinary_url: cloudinaryUrl,
            secure: true,
          });
          this.isCloudinaryConfigured = true;
          this.logger.log('Cloudinary initialized successfully via CLOUDINARY_URL');
        } else if (cloudName && apiKey && apiSecret) {
          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
          });
          this.isCloudinaryConfigured = true;
          this.logger.log(`Cloudinary initialized successfully for cloud: ${cloudName}`);
        } else {
          this.isCloudinaryConfigured = false;
          this.logger.log(
            'Cloudinary credentials not provided; falling back to local file storage',
          );
        }
      } catch (error: any) {
        this.isCloudinaryConfigured = false;
        this.logger.warn(
          `Cloudinary configuration failed: ${error.message}, using local storage`,
        );
      }
    }
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  // ============================================================
  // UPLOAD FILE - Supports both Cloudinary and Local
  // ============================================================

  async uploadFile(
    file: MulterFile,
    options: { folder?: string; useCloudinary?: boolean } = {},
  ): Promise<{ url: string; filename: string; publicId?: string }> {
    const defaultFolder =
      this.configService.get<string>('cloudinary.folder') || 'snapcart/products';
    const { folder = defaultFolder, useCloudinary = true } = options;

    // Try Cloudinary first if available and configured
    if (useCloudinary && cloudinary && streamifier && this.isCloudinaryConfigured) {
      try {
        return await this.uploadToCloudinary(file, folder);
      } catch (error: any) {
        this.logger.warn(
          `Cloudinary upload failed, falling back to local: ${error.message}`,
        );
        // Fall through to local upload
      }
    }

    // Fallback to local upload
    return this.uploadToLocal(file);
  }

  // ============================================================
  // CLOUDINARY UPLOAD
  // ============================================================

  private async uploadToCloudinary(
    file: MulterFile,
    folder: string,
  ): Promise<{ url: string; filename: string; publicId?: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error: any, result: any) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              filename: result.public_id.split('/').pop() || file.originalname,
              publicId: result.public_id,
            });
          }
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  // ============================================================
  // LOCAL UPLOAD
  // ============================================================

  private async uploadToLocal(
    file: MulterFile,
  ): Promise<{ url: string; filename: string }> {
    try {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/\s+/g, '_');
      const filename = `${timestamp}-${safeName}`;
      const filePath = path.join(this.uploadDir, filename);

      await fs.writeFile(filePath, file.buffer);

      const baseUrl =
        this.configService.get<string>('app.backendUrl') ||
        `http://localhost:${this.configService.get('port') || 3001}`;
      const url = `${baseUrl}/uploads/${filename}`;

      this.logger.log(`File uploaded locally: ${filename}`);
      return { url, filename };
    } catch (error: any) {
      this.logger.error(`File upload failed: ${error.message}`);
      throw new BadRequestException('File upload failed');
    }
  }

  // ============================================================
  // DELETE FILE
  // ============================================================

  async deleteFile(filename: string, publicId?: string): Promise<void> {
    // Delete from Cloudinary if publicId provided
    if (publicId && cloudinary && this.isCloudinaryConfigured) {
      try {
        await new Promise((resolve, reject) => {
          cloudinary.uploader.destroy(publicId, (error: any, result: any) => {
            if (error) reject(error);
            else resolve(result);
          });
        });
        this.logger.log(`File deleted from Cloudinary: ${publicId}`);
        return;
      } catch (error: any) {
        this.logger.warn(`Failed to delete from Cloudinary: ${error.message}`);
        // Continue to try local deletion
      }
    }

    // Delete from local
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
      this.logger.log(`File deleted locally: ${filename}`);
    } catch (error: any) {
      this.logger.warn(`Failed to delete file: ${error.message}`);
    }
  }

  // ============================================================
  // CHECK IF FILE EXISTS
  // ============================================================

  async fileExists(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // GET FILE URL
  // ============================================================

  getFileUrl(filename: string): string {
    const baseUrl =
      this.configService.get<string>('app.backendUrl') ||
      `http://localhost:${this.configService.get('port') || 3001}`;
    return `${baseUrl}/uploads/${filename}`;
  }
}
