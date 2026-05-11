# 🎬 Film Streaming Platform

> **Educational purposes only** — This project is built for learning full-stack web development.

## Overview

A full-stack film streaming platform where admins can manage films (upload, edit, delete) and users can browse and watch them.

## Tech Stack

**Frontend**
- React (Vite)
- Axios
- CSS

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Cloudinary (image & video storage)
- Multer (file upload)

## Features

- User authentication (login/register)
- JWT-based authorization
- Role-based access control (admin/user)
- Upload film thumbnail and video to Cloudinary
- Browse and watch films
- Admin panel: create, edit, delete films

## Project Structure
```
film-streaming-platform/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── services/
    │   └── App.css
    └── package.json
```

## Getting Started

### Prerequisites
- Node.js
- MongoDB (local or Atlas)
- Cloudinary account

### Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

```bash
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Disclaimer

This project is created for **educational purposes only** (with the assistance of artificial intelligence). All content uploaded during development is for testing and learning. Not intended for commercial use.
