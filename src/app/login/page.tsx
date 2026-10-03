import { Logo } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo className="text-lg" />
        <p className="text-muted-foreground">Learn it. Recall it. Explain it. Keep it.</p>
      </div>
      <Card>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                aria-invalid={Boolean(error)}
                className="h-10 bg-background px-3 md:text-base"
              />
              {error && <p className="text-sm text-coral-foreground">Wrong password. Try again.</p>}
            </div>
            <Button type="submit" size="lg" className="h-10">
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
