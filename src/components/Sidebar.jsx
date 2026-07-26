import React from "react";
import "./Sidebar.css";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: "\u2302" },
  { id: "settings", label: "Settings", icon: "\u2699" },
];

export default function Sidebar({ activePage, onNavigate, expanded, onToggle }) {
  return (
    <nav className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? "\u00AB" : "\u00BB"}
      </button>
      <div className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {expanded && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}
