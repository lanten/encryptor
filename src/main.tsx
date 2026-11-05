import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { AppRouter } from "@/app/router"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("root-missing")

createRoot(root).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
