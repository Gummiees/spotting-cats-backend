import * as tf from '@tensorflow/tfjs-node';

export interface NSFWResult {
  isNSFW: boolean;
  confidence: number;
  predictions: {
    [key: string]: number;
  };
}

export class NSFWService {
  private model: any = null;
  private isModelLoaded = false;

  async loadModel(): Promise<void> {
    try {
      // Use require for CommonJS compatibility
      const nsfw = require('nsfwjs');
      this.model = await nsfw.load();
      this.isModelLoaded = true;
      console.log('✅ NSFW model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load NSFW model:', error);
      throw error;
    }
  }

  async isModelReady(): Promise<boolean> {
    return this.isModelLoaded && this.model !== null;
  }

  async classifyImage(imageBuffer: Buffer): Promise<NSFWResult> {
    if (!this.model || !this.isModelLoaded) {
      throw new Error('NSFW model not loaded');
    }

    try {
      // Decode the image buffer
      const image = await tf.node.decodeImage(imageBuffer, 3);

      // Classify the image
      const predictions = await this.model.classify(image);

      // Clean up the tensor to prevent memory leaks
      image.dispose();

      // Convert predictions array to object
      const predictionObj: { [key: string]: number } = {};
      predictions.forEach((prediction: any) => {
        predictionObj[prediction.className] = prediction.probability;
      });

      // Calculate NSFW score (sum of Porn and Sexy predictions)
      const nsfwScore = (predictionObj.Porn || 0) + (predictionObj.Sexy || 0);
      const isNSFW = nsfwScore > 0.5; // Threshold can be adjusted

      return {
        isNSFW,
        confidence: nsfwScore,
        predictions: predictionObj,
      };
    } catch (error) {
      console.error('Error classifying image:', error);
      throw new Error('Failed to classify image');
    }
  }

  async validateImageBuffers(imageBuffers: Buffer[]): Promise<{
    isValid: boolean;
    invalidImages: string[];
    errors: string[];
  }> {
    const invalidImages: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < imageBuffers.length; i++) {
      const buffer = imageBuffers[i];
      const imageIndex = i + 1;

      try {
        // Check if buffer is valid
        if (!buffer || buffer.length === 0) {
          invalidImages.push(`image_${imageIndex}`);
          errors.push(`Empty image buffer for image ${imageIndex}`);
          continue;
        }

        // Classify the image
        const result = await this.classifyImage(buffer);

        if (result.isNSFW) {
          invalidImages.push(`image_${imageIndex}`);
          errors.push(
            `NSFW content detected in image ${imageIndex} (confidence: ${result.confidence.toFixed(
              3
            )})`
          );
        }
      } catch (error) {
        invalidImages.push(`image_${imageIndex}`);
        errors.push(
          `Error processing image ${imageIndex}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return {
      isValid: invalidImages.length === 0,
      invalidImages,
      errors,
    };
  }

  async validateImages(imageUrls: string[]): Promise<{
    isValid: boolean;
    invalidImages: string[];
    errors: string[];
  }> {
    const invalidImages: string[] = [];
    const errors: string[] = [];

    for (const imageUrl of imageUrls) {
      try {
        // Validate URL format
        if (!imageUrl || typeof imageUrl !== 'string') {
          invalidImages.push(imageUrl);
          errors.push(`Invalid image URL: ${imageUrl}`);
          continue;
        }

        // Fetch the image from URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
          invalidImages.push(imageUrl);
          errors.push(
            `Failed to fetch image: ${imageUrl} (status: ${response.status})`
          );
          continue;
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());

        // Check if image buffer is valid
        if (imageBuffer.length === 0) {
          invalidImages.push(imageUrl);
          errors.push(`Empty image buffer for: ${imageUrl}`);
          continue;
        }

        // Classify the image
        const result = await this.classifyImage(imageBuffer);

        if (result.isNSFW) {
          invalidImages.push(imageUrl);
          errors.push(
            `NSFW content detected in image: ${imageUrl} (confidence: ${result.confidence.toFixed(
              3
            )})`
          );
        }
      } catch (error) {
        invalidImages.push(imageUrl);
        errors.push(
          `Error processing image ${imageUrl}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return {
      isValid: invalidImages.length === 0,
      invalidImages,
      errors,
    };
  }
}

// Export a singleton instance
export const nsfwService = new NSFWService();
