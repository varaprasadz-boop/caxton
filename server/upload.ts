import { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Client } from '@replit/object-storage';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

// Try object storage first, fall back to local storage if it fails
async function uploadToObjectStorage(fileBuffer: Buffer, fileName: string): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    throw new Error('Object storage not configured');
  }
  
  const objectStorage = new Client();
  const objectPath = `.private/${fileName}`;
  await objectStorage.uploadFromBytes(objectPath, fileBuffer);
  return `/files/${fileName}`;
}

async function uploadToLocalStorage(fileBuffer: Buffer, fileName: string): Promise<string> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Save file locally
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, fileBuffer);
  console.log(`File saved locally: ${fileName}`);
  return `/files/${fileName}`;
}

export async function handleFileUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const fileExtension = file.originalname.split('.').pop() || '';
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    let fileUrl: string;
    
    // Try object storage first, fall back to local storage
    try {
      console.log(`Attempting object storage upload: ${fileName}`);
      fileUrl = await uploadToObjectStorage(file.buffer, fileName);
      console.log(`File uploaded to object storage: ${fileName}`);
    } catch (objectStorageError) {
      console.warn(`Object storage failed, using local fallback:`, objectStorageError.message);
      fileUrl = await uploadToLocalStorage(file.buffer, fileName);
    }
    
    res.json({
      url: fileUrl,
      filename: file.originalname,
      size: file.size
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error') });
  }
}