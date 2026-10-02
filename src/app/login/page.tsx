import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Learning Coach</h1>
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
          />
        </div>
        {error && <p className="text-sm text-destructive">Wrong password.</p>}
        <Button type="submit">Log in</Button>
      </form>
    </main>
  );
}
