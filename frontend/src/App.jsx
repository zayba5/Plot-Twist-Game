import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import "./index.css";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import SignUpPage from "./SignUp";
import AuthModal from "./AuthModal";
import { api } from "./global.jsx";

const LoginPage = lazy(() => import("./Login"));
const LobbyPage = lazy(() => import("./Lobby"));
const StoryPage = lazy(() => import("./StoryTelling"));
const VotingPage = lazy(() => import("./Voting"));
const ScorePage = lazy(() => import("./Scoreboard"));
const ResultsPage = lazy(() => import("./results"))


// start navigation functions
function NavItem({ menuOpen, closeMenu }) {
  const items = [
    { name: "Lobby", key: 1, route: "lobby" },
    { name: "Story Telling", key: 2, route: "story" },
    { name: "Voting", key: 3, route: "vote" },
    { name: "Scoreboard", key: 4, route: "score" },
    {name: "Results", key: 7, route: "results"}
  ];

  const navItems = items.map((item) => (
    <Link
      to={"/" + item.route}
      className="nav-item"
      id={item.name}
      key={item.key}
      onClick={closeMenu}
    >
      {item.name}
    </Link>
  ));

  return (
    <div id="nav-list-style" className={menuOpen ? "mobile-nav" : ""}>
      <div id="nav-items">{navItems}</div>
      <div className="greyed-out" onClick={closeMenu}></div>
    </div>
  );
}

function Header({ onOpenAuth, isLoggedIn, username, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleMenu() {
    setMenuOpen((prev) => !prev);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div id="head-wrapper">
      <div id="head">

        {/* LEFT */}
        <h1 id="header-title-container">Plot Twist</h1>

        {/* CENTER + RIGHT GROUP */}
        <div className="nav-right">
          <NavItem menuOpen={menuOpen} closeMenu={closeMenu} />

          <div className="nav-auth">
            <button onClick={() => !isLoggedIn && onOpenAuth()}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={isLoggedIn ? "limegreen" : "white"}
              >
                <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
              </svg>
            </button>

            {isLoggedIn && <span>{username}</span>}

            {isLoggedIn && (
              <button onClick={onLogout}>Logout</button>
            )}
          </div>
        </div>

        {/* RIGHT END (hamburger) */}
        <FontAwesomeIcon icon={faBars} onClick={toggleMenu} />

      </div>
    </div>
  );
}
// end navigation functions

// start sitewide building
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function PageState({
  currentUserId,
  isAuthenticated,
  username,
  setUsername,
  setCurrentUserId,
  setIsAuthenticated,
  setShowAuth
}) {
  
  async function startGuestSession() {
    const response = await fetch(`${api}session`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    setUsername(data.username);
    setCurrentUserId(data.user_id || null);
    setIsAuthenticated(Boolean(data.authenticated));
  }

  return (
    <div id="header-body">
      <Header
        onOpenAuth={() => setShowAuth(true)}
        isLoggedIn={isAuthenticated}
        username={username}
        onLogout={async () => {
          await fetch(`${api}logout`, {
            method: "POST",
            credentials: "include",
          });

          await startGuestSession();
        }}
      />
      <div id="page-body">
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            {/* DEFAULT PAGE → LOBBY */}
            <Route
              path="/"
              element={
                <LobbyPage
                  username={username}
                  setUsername={setUsername}
                  currentUserId={currentUserId}
                  isAuthenticated={isAuthenticated}
                />
              }
            />

            {/* AUTH */}
            <Route
              path="/login"
              element={
                <LoginPage
                  onSuccess={({ username = "", user_id = null, authenticated = true }) => {
                    setUsername(username);
                    setCurrentUserId(user_id);
                    setIsAuthenticated(Boolean(authenticated));
                  }}
                />
              }
            />
            <Route
              path="/signup"
              element={
                <SignUpPage
                  onSuccess={({ username = "", user_id = null, authenticated = true }) => {
                    setUsername(username);
                    setCurrentUserId(user_id);
                    setIsAuthenticated(Boolean(authenticated));
                  }}
                />
              }
            />

            {/* MAIN APP */}
            <Route
              path="/lobby"
              element={
                <LobbyPage
                  username={username}
                  setUsername={setUsername}
                  currentUserId={currentUserId}
                  isAuthenticated={isAuthenticated}
                />
              }
            />
            <Route path="/story" element={<StoryPage />} />
            <Route path="/vote" element={<VotingPage />} />
            <Route path="/score" element={<ScorePage />} />
            <Route path="/results" element={<ResultsPage />} />

            {/* FALLBACK */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <h1>The page you were looking for doesn't exist</h1>
    </div>
  );
}

export default function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const startedRef = useRef(false);

  const [showAuth, setShowAuth] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const guestUsernameRef = useRef("");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function initSession() {
      try {
        const response = await fetch(
          `${api}session?username=${encodeURIComponent(guestUsernameRef.current)}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`session init failed: ${response.status}`);
        }

        const data = await response.json();

        setUsername(data.username || guestUsernameRef.current);
        setCurrentUserId(data.user_id || null);
        setIsAuthenticated(Boolean(data.authenticated));

        setSessionReady(true);
      } catch (err) {
        console.error(err);
        setSessionError("Could not start session.");
      }
    }

    initSession();
  }, []);

  if (sessionError) return <div>{sessionError}</div>;
  if (!sessionReady) return <div>Starting session...</div>;

  return (
    <div id="main-page">
      <Router>
        <ScrollToTop />
        <PageState
          currentUserId={currentUserId}
          isAuthenticated={isAuthenticated}
          username={username}
          setUsername={setUsername}
          setCurrentUserId={setCurrentUserId}
          setIsAuthenticated={setIsAuthenticated}
          setShowAuth={setShowAuth}
        />
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onSuccess={({ username = "", user_id = null, authenticated = true }) => {
              setUsername(username);
              setCurrentUserId(user_id);
              setIsAuthenticated(Boolean(authenticated));
            }}
          />
        )}
      </Router>
    </div>
  );
}
