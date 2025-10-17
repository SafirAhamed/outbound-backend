const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// --- 1. CONFIGURE AWS S3 CLIENT ---
// The client will automatically use the environment variables (AWS_ACCESS_KEY_ID, etc.)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// --- 2. MULTER MIDDLEWARE (Memory Storage for Vercel) ---
// This stores the uploaded file in RAM (req.file.buffer) instead of the ephemeral disk.
const storage = multer.memoryStorage();
exports.upload = multer({ storage: storage });

// --- 3. S3 UPLOAD FUNCTION ---
exports.uploadToS3 = async (file) => {
  if (!file) return null;

  // Create a unique file name in the 'tours/' folder
  const fileExtension = file.originalname.split('.').pop();
  const keyName = `tours/${uuidv4()}-${Date.now()}.${fileExtension}`;

  // S3 upload parameters
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: keyName, // The file path and name in the S3 bucket
    Body: file.buffer, // The file content (the buffer from multer)
    ContentType: file.mimetype,
    // ACL: 'public-read', // ⚠️ IMPORTANT: Makes the file publicly accessible via URL
  };

  try {
    // Create the command and send it to S3
    const command = new PutObjectCommand(params);
    console.log("Uploading to S3 with params:", params);
    await s3Client.send(command);

    // Construct the public URL for the file
    const publicUrl = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

    return { publicUrl };

  } catch (err) {
    console.error("S3 Upload Error:", err);
    throw new Error('Failed to upload image to S3.');
  }
};