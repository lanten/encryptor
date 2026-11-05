import { HashRouter, Route, Routes } from "react-router"
import { AppShell } from "@/app/app-shell"
import { AesGcmPage } from "@/pages/aes-gcm/aes-gcm-page"
import { HomePage } from "@/pages/home/home-page"

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="aes-gcm" element={<AesGcmPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
