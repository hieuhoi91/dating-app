import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {}

  async uploadImage(
    file: Buffer,
    folder: string,
  ): Promise<{ publicId: string; secureUrl: string }> {
    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL');
    if (!cloudinaryUrl) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured on the backend.',
      );
    }

    const parsedUrl = new URL(cloudinaryUrl);
    cloudinary.config({
      cloud_name: parsedUrl.hostname,
      api_key: decodeURIComponent(parsedUrl.username),
      api_secret: decodeURIComponent(parsedUrl.password),
      secure: true,
    });
    const result = await new Promise<{
      public_id: string;
      secure_url: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, uploaded) => {
          if (error) {
            reject(error);
            return;
          }
          if (!uploaded) {
            reject(new Error('Cloudinary returned no upload result.'));
            return;
          }
          resolve(uploaded);
        },
      );
      stream.end(file);
    });

    return { publicId: result.public_id, secureUrl: result.secure_url };
  }

  async deleteImage(publicId: string): Promise<void> {
    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL');
    if (!cloudinaryUrl) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured on the backend.',
      );
    }

    const parsedUrl = new URL(cloudinaryUrl);
    cloudinary.config({
      cloud_name: parsedUrl.hostname,
      api_key: decodeURIComponent(parsedUrl.username),
      api_secret: decodeURIComponent(parsedUrl.password),
      secure: true,
    });
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error('Cloudinary could not delete the requested image.');
    }
  }
}
