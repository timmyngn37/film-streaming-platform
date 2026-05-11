const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');

const useCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    !process.env.CLOUDINARY_CLOUD_NAME.includes('your_cloud_name') &&
    !process.env.CLOUDINARY_API_KEY.includes('your_api_key') &&
    !process.env.CLOUDINARY_API_SECRET.includes('your_api_secret')
);

const memoryStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only jpg, png, webp images are allowed'));
    }
};

const videoFilter = (req, file, cb) => {
    const allowed = ['video/mp4', 'video/x-matroska', 'video/x-msvideo', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only mp4, mkv, avi, mov videos are allowed'));
    }
};

const uploadToCloudinary = (folder, resourceType = 'image') => ({
    single: (fieldName) => [
        multer({
            storage: memoryStorage,
            fileFilter: resourceType === 'image' ? imageFilter : videoFilter
        }).single(fieldName),
        async (req, res, next) => {
            if (!req.file) return next();
            try {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder, resource_type: resourceType },
                        (error, result) => error ? reject(error) : resolve(result)
                    );
                    stream.end(req.file.buffer);
                });
                req.file.url = result.secure_url;
                req.file.public_id = result.public_id;
                next();
            } catch (error) {
                console.error("Cloudinary upload error:", error);
                next(error);
            }
        }
    ]
});

const localUploadFolder = (folder) => {
    const destinationPath = path.join(__dirname, '../uploads', folder);
    fs.mkdirSync(destinationPath, { recursive: true });
    return multer.diskStorage({
        destination: () => destinationPath,
        filename: (req, file, cb) => {
            const extension = path.extname(file.originalname.toLowerCase());
            const basename = path.basename(file.originalname, extension);
            const safeName = basename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '');
            cb(null, `${Date.now()}-${safeName}${extension}`);
        }
    });
};

const wrapLocalUpload = (storage, folderName) => {
    const upload = multer({ storage });
    return {
        single: (fieldName) => (req, res, next) => {
            upload.single(fieldName)(req, res, (err) => {
                if (err) return next(err);
                if (req.file) {
                    const host = `${req.protocol}://${req.get('host')}`;
                    req.file.url = `${host}/uploads/${folderName}/${req.file.filename}`;
                    req.file.public_id = req.file.filename;
                }
                next();
            });
        }
    };
};

const uploadImage = useCloudinary
    ? uploadToCloudinary('films/thumbnails', 'image')
    : wrapLocalUpload(localUploadFolder('thumbnails'), 'thumbnails');

const uploadVideo = useCloudinary
    ? uploadToCloudinary('films/videos', 'video')
    : wrapLocalUpload(localUploadFolder('videos'), 'videos');

module.exports = { uploadImage, uploadVideo };