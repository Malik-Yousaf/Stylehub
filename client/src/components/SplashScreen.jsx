import React from "react";

export default function SplashScreen({ hide }) {
  return (
    <div className={"splash-screen" + (hide ? " hide" : "")} aria-hidden={hide}>
      <div className="splash-inner">
        <div className="splash-logo">Style<span className="dot">Hub</span></div>
        <div className="splash-bagline">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 16 L14 12 A10 10 0 0 1 34 12 L34 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="8" y="16" width="32" height="26" rx="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div className="splash-tagline">Let&rsquo;s Start Shopping</div>
        <div className="splash-loader"><span></span></div>
      </div>
    </div>
  );
}
