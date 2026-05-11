const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const filmController = require('../controllers/filmController');
const { uploadImage, uploadVideo } = require('../middleware/upload');
const { auth: authenticate, isAdmin: requireAdmin } = require('../middleware/authMiddleware');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateId = (req, res, next) => {
    if (!isValidId(req.params.id))
        return res.status(400).json({ error: 'Invalid film ID' });
    next();
};

router.post('/:id/thumbnail', authenticate, requireAdmin,
    ...uploadImage.single('thumbnail'),
    validateId,
    filmController.uploadThumbnail
);

router.post('/:id/video', authenticate, requireAdmin,
    ...uploadVideo.single('video'),
    validateId,
    filmController.uploadVideo
);

router.post('/', authenticate, requireAdmin, filmController.createFilm);

router.get('/', filmController.getFilms);
router.get('/:id', validateId, filmController.getFilmById);
router.delete('/:id', authenticate, requireAdmin, validateId, filmController.deleteFilm);
router.put('/:id', authenticate, requireAdmin, validateId, filmController.updateFilm);

module.exports = router;