import { NavLink, Outlet } from "react-router";
import { FolderGit2 } from "lucide-react";
import { homeNav, tools } from "@/app/nav";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const links = [homeNav, ...tools.map(({ to, label }) => ({ to, label }))];
const repositoryUrl = "https://github.com/lanten/encryptor";

export function AppShell() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
          <span className="text-sm font-medium">加解密</span>
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  cn("rounded-md px-2.5 py-1.5 text-sm text-muted-foreground", isActive && "bg-muted text-foreground")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <FolderGit2 className="size-4" />
            GitHub
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
