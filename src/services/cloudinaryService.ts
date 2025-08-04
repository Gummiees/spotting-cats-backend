import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import crypto from 'crypto';

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryService {
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      console.log('✅ Cloudinary configured successfully');
    } else {
      console.warn(
        '⚠️ Cloudinary not configured - missing environment variables'
      );
    }
  }

  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate a hash for an image buffer to detect duplicates
   */
  private generateImageHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if an image with the same hash already exists in Cloudinary
   */
  private async findExistingImage(
    hash: string
  ): Promise<CloudinaryUploadResult | null> {
    try {
      // Search for images with the same hash in the metadata
      const result = await cloudinary.search
        .expression(`metadata.hash=${hash}`)
        .max_results(1)
        .execute();

      if (result.resources.length > 0) {
        const resource = result.resources[0];
        return {
          publicId: resource.public_id,
          url: resource.url,
          secureUrl: resource.secure_url,
          width: resource.width,
          height: resource.height,
          format: resource.format,
          bytes: resource.bytes,
        };
      }
      return null;
    } catch (error) {
      console.error('Error searching for existing image:', error);
      return null;
    }
  }

  /**
   * Upload an image to Cloudinary with duplicate detection
   */
  async uploadImage(
    buffer: Buffer,
    options: {
      folder?: string;
      transformation?: any;
      publicId?: string;
    } = {}
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      // Generate hash for duplicate detection
      const hash = this.generateImageHash(buffer);

      // Check if image already exists
      const existingImage = await this.findExistingImage(hash);
      if (existingImage) {
        console.log('Found existing image with same hash, reusing URL');
        return existingImage;
      }

      // Convert buffer to stream
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      // Upload options
      const uploadOptions: any = {
        folder: options.folder || 'cats',
        resource_type: 'image',
        transformation: options.transformation || [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:eco' },
        ],
        metadata: {
          hash: hash,
        },
      };

      if (options.publicId) {
        uploadOptions.public_id = options.publicId;
      }

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else if (result) {
              resolve({
                publicId: result.public_id,
                url: result.url,
                secureUrl: result.secure_url,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes,
              });
            } else {
              reject(new Error('Cloudinary upload failed: No result returned'));
            }
          }
        );

        stream.pipe(uploadStream);
      });
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete an image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      return false;
    }
  }

  /**
   * Get image information from Cloudinary
   */
  async getImageInfo(publicId: string): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      console.error('Error getting image info from Cloudinary:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const cloudinaryService = new CloudinaryService();
