
console.log("Entry point index.tsx reached");
import React from 'react';
// @ts-ignore
if (typeof window !== 'undefined' && !window.process) {
  console.log("Initializing process shim");
  // @ts-ignore
  window.process = { env: {} };
}
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
