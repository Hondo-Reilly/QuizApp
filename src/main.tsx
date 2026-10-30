import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { installFileDropGuard } from "./lib/fileDropGuard";
import { router } from "./router";
import "./index.css";

installFileDropGuard(window);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
