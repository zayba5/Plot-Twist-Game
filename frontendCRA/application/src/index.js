import React, { useState, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const SamplePage = lazy(() => import("./Display2"));
const SamplePage2 = lazy(() => import("./Display1"));

// start navigation functions
function NavItem({ menuOpen, closeMenu }) {
  const items = [
    { name: "Sample1", key: 1, route: "SamplePage" },
    { name: "Sample2", key: 2, route: "SamplePage2" },
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
        <h1 id="header-title-container">Title</h1>
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
    <div>
      <Header />
      <div id="page-body">
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<SamplePage />} />
            <Route path="/SamplePage" element={<SamplePage />} />
            <Route path="/SamplePage2" element={<SamplePage2 />} />
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

function Main() {
  return (
    <div id="main-page">
      <Router>
        <ScrollToTop />
        <PageState />
      </Router>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);