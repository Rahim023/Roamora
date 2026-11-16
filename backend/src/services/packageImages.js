import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single('image');

export function receivePackageImage(request, response, next) {
  upload(request, response, (error) => {
    if (error instanceof multer.MulterError) {
      next(new HttpError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or less.' : 'Invalid image upload.'));
      return;
    }
    next(error);
  });
}

export async function uploadPackageImage(file) {
  if (!file) throw new HttpError(400, 'Choose an image to upload.');
  const bytes = file.buffer;
  const jpeg = file.mimetype === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = file.mimetype === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = file.mimetype === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!jpeg && !png && !webp) throw new HttpError(400, 'Use a JPEG, PNG, or WebP image.');

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new HttpError(503, 'Image uploads are not configured. Contact the site administrator.');
  }
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'roamora/packages' }, (error, value) => {
      if (error) reject(new HttpError(502, 'Image upload failed. Please try again.'));
      else resolve(value);
    });
    stream.on('error', () => reject(new HttpError(502, 'Image upload failed. Please try again.')));
    stream.end(bytes);
  });
  if (!result?.secure_url?.startsWith('https://res.cloudinary.com/')) throw new HttpError(502, 'Image upload returned an invalid URL.');
  return result.secure_url;
}
