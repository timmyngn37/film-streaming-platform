# 🎬 Film Streaming Platform

> **Educational DevOps Project** — A full-stack film streaming platform built for learning modern web development, CI/CD, Docker containerization, security scanning, and observability.

---

## 📌 Overview

This project is a full-stack film streaming platform where:

- 👨‍💻 Admins can manage films (create, update, delete, upload media)
- 👀 Users can browse and watch films
- 🔐 Authentication & role-based access control (JWT)
- 🚀 Fully containerized with Docker & automated CI/CD using Jenkins
- 📊 Integrated monitoring & security tools

---

## 🧱 Tech Stack

### 🎨 Frontend
- React (Vite)
- Axios
- CSS
- Built as static assets
- Served via Nginx (production)

### ⚙️ Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Multer (file uploads)
- Cloudinary (image/video storage)

### 🐳 DevOps / Infrastructure
- Docker & Docker Compose
- Jenkins CI/CD Pipeline
- SonarQube (Code Quality Analysis)
- Trivy (Container Security Scanning)
- Prometheus (Metrics collection)
- Grafana (Visualization dashboard)
- Alertmanager (Alerting system)
- Node Exporter (Host metrics)

---

## 🏗️ Architecture
```
Browser
↓
Frontend (Nginx container :5173 → 80)
↓
Backend API (Node.js :5000)
↓
MongoDB + Cloud storage (Cloudinary)
```

---

## 🚀 CI/CD Pipeline Flow
```
Git Push
↓
Jenkins Pipeline Trigger
↓
Build Docker Images
↓
Run Tests
↓
SonarQube Quality Gate
↓
Security Scan (npm audit + Trivy)
↓
Push Images to Docker Hub
↓
Deploy via Docker Compose
↓
Monitoring Stack (Prometheus + Grafana)
```

---

## 🌐 Ports Mapping

| Service        | Port Mapping |
|----------------|-------------|
| Frontend       | 5173:80     |
| Backend        | 5000:5000   |
| SonarQube      | 9000:9000   |
| Prometheus     | 9090:9090   |
| Grafana        | 3001:3000   |
| Alertmanager   | 9093:9093   |
| Node Exporter  | 9100:9100   |

---

## ✨ Features

### 🔐 Authentication
- User register/login
- JWT-based authentication
- Role-based access (Admin/User)

### 🎬 Film Management
- Upload film thumbnail & video
- Store media on Cloudinary
- CRUD operations (admin only)

### 📺 Streaming
- Browse films
- Watch video content

### 📊 DevOps Features
- CI/CD automation (Jenkins)
- Code quality checks (SonarQube)
- Security scanning (Trivy + npm audit)
- Monitoring stack (Grafana + Prometheus)

---

## 🐳 Docker Setup
```
docker compose up -d --build
docker compose down
```

---

## 📦 Environment Variables
Create ```.env``` file in ```/backend```:
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

---

## 📌 Disclaimer
This project is created for **educational purposes only** (with the assistance of artificial intelligence). All content uploaded during development is for testing and learning. Not intended for commercial use.
