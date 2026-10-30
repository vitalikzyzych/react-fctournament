import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { addLocale, locale, PrimeReactProvider } from "primereact/api";

import App from "./App";

import "primereact/resources/themes/lara-dark-teal/theme.css";
import "primereact/resources/primereact.min.css";
import "primeflex/primeflex.css";
import "./styles/main.css";

addLocale("uk", {
  accept: "Так",
  reject: "Ні",
  choose: "Обрати",
  upload: "Завантажити",
  cancel: "Скасувати",
  clear: "Очистити",
  emptyMessage: "Немає варіантів",
  emptyFilterMessage: "Нічого не знайдено",
});
locale("uk");

// A tab opened before a deploy still references the old hashed chunks, which
// the deploy removed, so opening a lazy screen fails. Reload once to pick up
// the new index.html; the timestamp guard stops a reload loop (from web-app).
const CHUNK_RELOAD_KEY = "chunk_reload_at";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <PrimeReactProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PrimeReactProvider>
  </StrictMode>
);
