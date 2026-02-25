import imageCompression from 'browser-image-compression';

export const compressImage = async (file) => {
  // If the file isn't an image, just return it as-is
  if (!file.type.startsWith('image/')) return file;

  const options = {
    maxSizeMB: 0.3, // Maximum file size (300KB)
    maxWidthOrHeight: 1280, // Shrink massive 4K photos down to HD
    useWebWorker: true, // Speeds up the compression
  };

  try {
    console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    return file; // If it fails, return original
  }
};