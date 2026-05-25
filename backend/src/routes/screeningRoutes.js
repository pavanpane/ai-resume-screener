const express = require('express');
const router = express.Router();
const screeningController = require('../controllers/screeningController');

router.post('/screen', screeningController.screenResume);

module.exports = router;
