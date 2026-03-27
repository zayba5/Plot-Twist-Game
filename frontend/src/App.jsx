import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import "./index.css";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import SignUpPage from "./SignUp";

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
    { name: "Sign Up", key: 5, route: "signup" },
    {name: "Results", key: 6, route: "results"}
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

function Header() {
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
        <h1 id="header-title-container">Plot Twist</h1>
        <FontAwesomeIcon icon={faBars} onClick={toggleMenu} />
        <NavItem menuOpen={menuOpen} closeMenu={closeMenu} />
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

function PageState() {
  return (
    <div id="header-body">
      <Header />
      <div id="page-body">
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/story" element={<StoryPage />} />
            <Route path="/vote" element={<VotingPage />} />
            <Route path="/score" element={<ScorePage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/results" element={<ResultsPage/>}/>
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

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function initSession() {
      try {
        const response = await fetch("http://localhost:5000/session", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`session init failed: ${response.status}`);
        }

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
        <PageState />
      </Router>
    </div>
  );
}