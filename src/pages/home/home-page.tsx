import { Link } from "react-router"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { tools } from "@/app/nav"

export function HomePage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">工具</h1>
        <p className="text-sm text-muted-foreground">
          运算都在浏览器内完成，不会上传明文或密码。
        </p>
      </div>
      <div className="grid gap-3">
        {tools.map((tool) => (
          <Link key={tool.to} to={tool.to} className="block rounded-xl">
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle>{tool.label}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
