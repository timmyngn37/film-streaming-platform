import { useEffect, useState } from "react";
import API from "../services/api";

function Films({ token }) {
  const [films, setFilms] = useState([]);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [role, setRole] = useState("");
  const [yearError, setYearError] = useState("");
  const [editingFilm, setEditingFilm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  const getMediaUrl = (media) => {
    if (!media) return null;
    return media.url || media.secure_url || media.path || media;
  };

  const fetchFilms = async () => {
    try {
      const res = await API.get("/films");
      setFilms(res.data.map((film) => ({
        ...film,
        id: film._id || film.id,
        year: film.year || film.releaseYear,
      })));
    } catch (error) {
      console.error("Fetch films error:", error.response?.data);
    }
  };

  const resetForm = () => {
    setTitle("");
    setYear("");
    setDescription("");
    setThumbnailFile(null);
    setVideoFile(null);
    setEditingFilm(null);
    setYearError("");
    setLoadingMsg("");
  };

  const addFilm = async () => {
    const yearValue = Number(year);
    if (!title.trim()) return alert("Title is required.");
    if (!year || !Number.isInteger(yearValue) || yearValue <= 0) return alert("Year must be a positive number.");

    setLoading(true);
    try {
      if (editingFilm) {
        setLoadingMsg("Updating film...");
        await API.put(
          `/films/${editingFilm.id}`,
          { title, description, releaseYear: yearValue },
          { headers }
        );
        alert("Film updated successfully!");
      } else {
        setLoadingMsg("Creating film...");
        const createRes = await API.post(
          "/films",
          { title, description, releaseYear: yearValue },
          { headers }
        );
        const filmId = createRes.data._id || createRes.data.id;
        console.log("Film created, ID:", filmId);

        if (thumbnailFile) {
          setLoadingMsg("Uploading thumbnail...");
          const formData = new FormData();
          formData.append("thumbnail", thumbnailFile);
          await API.post(`/films/${filmId}/thumbnail`, formData, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 60000,
            onUploadProgress: (e) => {
              const percent = Math.round((e.loaded * 100) / e.total);
              setLoadingMsg(`Uploading thumbnail... ${percent}%`);
              console.log(`Thumbnail: ${percent}%`);
            }
          });
          console.log("Thumbnail uploaded");
        }

        if (videoFile) {
          setLoadingMsg("Uploading video... (this may take a while)");
          const formData = new FormData();
          formData.append("video", videoFile);
          await API.post(`/films/${filmId}/video`, formData, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 300000,
            onUploadProgress: (e) => {
              const percent = Math.round((e.loaded * 100) / e.total);
              setLoadingMsg(`Uploading video... ${percent}%`);
              console.log(`Video: ${percent}%`);
            }
          });
          console.log("Video uploaded");
        }

        alert("Film created successfully!");
      }

      resetForm();
      fetchFilms();
    } catch (error) {
      console.error("Save film error:", error.response?.data || error.message);
      alert(`Error: ${error.response?.data?.error || "Failed to save film"}`);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const deleteFilm = async (id) => {
    if (!window.confirm("Delete this film?")) return;
    try {
      await API.delete(`/films/${id}`, { headers });
      fetchFilms();
    } catch (error) {
      console.error("Delete error:", error.response?.data);
      alert(`Error: ${error.response?.data?.error || "Failed to delete film"}`);
    }
  };

  const editFilm = (film) => {
    setEditingFilm(film);
    setTitle(film.title);
    setYear(film.year.toString());
    setDescription(film.description || "");
  };

  useEffect(() => {
    const parsed = parseJwt(token);
    setRole(parsed?.role || "");
    fetchFilms();
  }, [token]);

  return (
    <div>
      <h2>Films</h2>
      <div><strong>Logged in as:</strong> {role || "user"}</div>

      {role === 'admin' && (
        <div className="admin-panel">
          <h3>{editingFilm ? "Edit film" : "Add new film"}</h3>

          <label>Title</label>
          <input
            placeholder="Enter film title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label>Year</label>
          <input
            placeholder="Enter release year"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setYearError(e.target.value && !/^\d+$/.test(e.target.value) ? "Year must be a positive integer" : "");
            }}
          />
          {yearError && <div style={{ color: 'red', marginTop: '0.25rem' }}>{yearError}</div>}

          <label>Description</label>
          <textarea
            placeholder="Enter film description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          {!editingFilm && (
            <>
              <label>Thumbnail image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0] || null;
                  console.log("Thumbnail selected:", file?.name);
                  setThumbnailFile(file);
                }}
              />

              <label>Video file</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files[0] || null;
                  console.log("Video selected:", file?.name);
                  setVideoFile(file);
                }}
              />
            </>
          )}

          {loading && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              color: '#0369a1',
              fontWeight: 600
            }}>
              ⏳ {loadingMsg}
            </div>
          )}

          <button onClick={addFilm} className="button-primary" disabled={loading}>
            {loading ? "Saving..." : editingFilm ? "Update film" : "Create film"}
          </button>

          {editingFilm && (
            <button onClick={resetForm} className="button-primary" style={{ marginLeft: '1rem' }} disabled={loading}>
              Cancel
            </button>
          )}
        </div>
      )}

      <hr />

      {films.map((f) => (
        <div key={f.id} className="film-card">

          <div className="film-card-top">

            {getMediaUrl(f.thumbnail) && (
              <div className="film-card-thumbnail">
                <a
                  href={getMediaUrl(f.thumbnail)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={getMediaUrl(f.thumbnail)}
                    alt={`${f.title} thumbnail`}
                  />
                </a>
              </div>
            )}

            <div className="film-card-info">

              <h3>
                {f.title} ({f.year})
              </h3>

              {f.description && (
                <p>{f.description}</p>
              )}

              {getMediaUrl(f.video) && (
                <a
                  href={getMediaUrl(f.video)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '0.5rem',
                    color: '#0369a1',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  ▶ Watch film
                </a>
              )}

            </div>
          </div>

          {role === 'admin' && (
            <div style={{ marginTop: '0.75rem' }}>
              <button
                className="button-secondary delete-button"
                onClick={() => deleteFilm(f.id)}
              >
                Delete
              </button>

              <button
                className="button-secondary"
                onClick={() => editFilm(f)}
                style={{ marginLeft: '0.5rem' }}
              >
                Edit
              </button>
            </div>
          )}

        </div>
      ))}
    </div>
  );
}

export default Films;