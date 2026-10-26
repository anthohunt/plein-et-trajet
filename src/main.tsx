import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import BarriereErreur from "./components/BarriereErreur";
import "./styles/tokens.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BarriereErreur>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </BarriereErreur>
  </StrictMode>,
);
