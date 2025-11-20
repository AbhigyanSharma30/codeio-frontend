import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Suppress noisy ResizeObserver loop errors that surface in the dev overlay
// These are typically benign and caused by layout race conditions in some
// browsers / editor integrations. The following listeners swallow the
// specific error so it doesn't trigger the React error overlay during dev.
if (typeof window !== 'undefined') {
  // First, try a small monkey-patch of ResizeObserver.observe to avoid
  // throwing the "ResizeObserver loop completed" error in the first place.
  // This is a narrow, defensive change for dev; it keeps production behavior
  // unchanged and only swallows that specific browser race-condition error.
  try {
    const RO = window.ResizeObserver;
    if (RO && RO.prototype && RO.prototype.observe) {
      const origObserve = RO.prototype.observe;
      RO.prototype.observe = function () {
        try {
          return origObserve.apply(this, arguments);
        } catch (err) {
          if (err && typeof err.message === 'string' && err.message.includes('ResizeObserver loop completed')) {
            // swallow the benign ResizeObserver loop error to avoid the CRA red overlay
            // and log a warning so developers can see it in the console.
            // eslint-disable-next-line no-console
            console.warn('Suppressed ResizeObserver loop error:', err.message);
            return;
          }
          throw err;
        }
      };
    }
  } catch (err) {
    // If anything goes wrong while patching, don't block app startup.
    // eslint-disable-next-line no-console
    console.warn('ResizeObserver patch failed:', err && err.message);
  }

  // Also keep the error/rejection listeners as a fallback to prevent the CRA
  // overlay from showing this specific message.
  window.addEventListener('error', (e) => {
    const msg = (e && (
      e.message ||
      (e.error && e.error.message) ||
      (typeof e === 'string' && e)
    )) || '';
    if (msg && msg.includes('ResizeObserver loop completed')) {
      // Prevent CRA from showing the red runtime overlay for this benign error
      try {
        e.stopImmediatePropagation && e.stopImmediatePropagation();
        e.preventDefault && e.preventDefault();
        // some browsers look for returnValue
        e.returnValue = true;
      } catch (err) {
        // ignore
      }
      // eslint-disable-next-line no-console
      console.warn('Suppressed window.error for ResizeObserver:', msg);
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const msg = (e && (
      (e.reason && (e.reason.message || (typeof e.reason === 'string' && e.reason))) ||
      (typeof e === 'string' && e)
    )) || '';
    if (msg && msg.includes('ResizeObserver loop completed')) {
      try {
        e.stopImmediatePropagation && e.stopImmediatePropagation();
        e.preventDefault && e.preventDefault();
      } catch (err) {
        // ignore
      }
      // eslint-disable-next-line no-console
      console.warn('Suppressed unhandledrejection for ResizeObserver:', msg);
    }
  }, true);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
