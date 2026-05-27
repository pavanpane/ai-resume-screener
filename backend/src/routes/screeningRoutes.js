const express = require('express');
const multer = require('multer');
const router = express.Router();
const screeningController = require('../controllers/screeningController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

router.post('/screen/:role', upload.single('resume'), screeningController.screenResume);
router.post('/screen', upload.single('resume'), screeningController.screenResume);
router.post('/batch-screen/:role', uploadMultiple.array('resumes', 10), screeningController.batchScreenResumes);
router.post('/batch-screen', uploadMultiple.array('resumes', 10), screeningController.batchScreenResumes);

module.exports = router;
