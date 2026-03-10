const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'video') {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed for the video field!'), false);
        }
    } else if (file.fieldname === 'cover' || file.fieldname === 'avatar' || file.fieldname === 'favicon' || file.fieldname === 'background') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error(`Only image files are allowed for the ${file.fieldname} field!`), false);
        }
    } else {
        cb(new Error('Unexpected field'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500 MB limit
    }
}).fields([
    { name: 'video', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
    { name: 'avatar', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'background', maxCount: 1 }
]);

module.exports = upload;
