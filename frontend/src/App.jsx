import { useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Films from "./pages/Films";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
  };

  const [authMode, setAuthMode] = useState("login");
  
  return (
    <div className="App">
      {!token ? (
        <div>
          {authMode === "login" ? (
            <Login setToken={setToken} />
          ) : (
            <Register setToken={setToken} />
          )}
          <button
            type="button"
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
          >
            {authMode === "login" ? "Create a new account" : "Back to login"}
          </button>
        </div>
      ) : (
        <div>
          <Films token={token} />
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </div>
  );
}

export default App;