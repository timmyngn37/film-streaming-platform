const Film = require('../models/Film');

const getFilms = async (req, res) => {
    try {
        const films = await Film.find();
        res.json(films);
    } catch (error) {
        console.error('Get films error:', error);
        res.status(500).json({ error: 'Unable to fetch films' });
    }
};

const getFilmById = async (req, res) => {
    try {
        const film = await Film.findById(req.params.id);
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }
        res.json(film);
    } catch (error) {
        console.error('Get film by id error:', error);
        res.status(400).json({ error: 'Invalid film id' });
    }
};

const createFilm = async (req, res) => {
    const { title, description, releaseYear } = req.body;

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Title is required' });
    }

    const yearNumber = Number(releaseYear);
    if (!Number.isInteger(yearNumber) || yearNumber <= 0) {
        return res.status(400).json({ error: 'releaseYear must be a positive integer' });
    }

    try {
        const film = new Film({ title, description, releaseYear: yearNumber });
        await film.save();
        res.status(201).json(film);
    } catch (error) {
        console.error('Create film error:', error);
        res.status(500).json({ error: 'Unable to create film' });
    }
};

const updateFilm = async (req, res) => {
    try {
        const film = await Film.findById(req.params.id);
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }

        const { title, description, releaseYear } = req.body;
        film.title = title || film.title;
        film.description = description || film.description;
        film.releaseYear = releaseYear || film.releaseYear;

        await film.save();
        res.json(film);
    } catch (error) {
        console.error('Update film error:', error);
        res.status(400).json({ error: 'Invalid film id' });
    }
};

const deleteFilm = async (req, res) => {
    try {
        const film = await Film.findByIdAndDelete(req.params.id);
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Delete film error:', error);
        res.status(400).json({ error: 'Invalid film id' });
    }
};

const uploadThumbnail = async (req, res) => {
    console.log('uploadThumbnail called for film', req.params.id, 'file:', !!req.file);
    if (!req.file) {
        return res.status(400).json({ error: 'Thumbnail file is required' });
    }

    const fileUrl = req.file.url || req.file.secure_url || req.file.path;
    const publicId = req.file.filename || req.file.public_id;
    console.log('uploadThumbnail fileUrl:', fileUrl, 'publicId:', publicId);

    if (!fileUrl) {
        return res.status(500).json({ error: 'Failed to read thumbnail upload URL' });
    }

    try {
        const film = await Film.findByIdAndUpdate(
            req.params.id,
            { thumbnail: { url: fileUrl, public_id: publicId } },
            { new: true }
        );
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }
        res.json(film);
    } catch (error) {
        console.error('Upload thumbnail error:', error);
        res.status(500).json({ error: 'Unable to upload thumbnail' });
    }
};

const uploadVideo = async (req, res) => {
    console.log('uploadVideo called for film', req.params.id, 'file:', !!req.file);
    if (!req.file) {
        return res.status(400).json({ error: 'Video file is required' });
    }

    const fileUrl = req.file.url || req.file.secure_url || req.file.path;
    const publicId = req.file.filename || req.file.public_id;
    console.log('uploadVideo fileUrl:', fileUrl, 'publicId:', publicId);

    if (!fileUrl) {
        return res.status(500).json({ error: 'Failed to read video upload URL' });
    }

    try {
        const film = await Film.findByIdAndUpdate(
            req.params.id,
            { video: { url: fileUrl, public_id: publicId } },
            { new: true }
        );
        if (!film) {
            return res.status(404).json({ error: 'Film not found' });
        }
        res.json(film);
    } catch (error) {
        console.error('Upload video error:', error);
        res.status(500).json({ error: 'Unable to upload video' });
    }
};

module.exports = { getFilms, getFilmById, createFilm, updateFilm, deleteFilm, uploadThumbnail, uploadVideo };