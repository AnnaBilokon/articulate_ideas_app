import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Learning Coach</h1>
      <p className="text-muted-foreground">
        Learn a topic in short chunks, recall it, explain it in your own words,
        and review it on schedule.
      </p>
      <div>
        <Button disabled>Nothing due today</Button>
      </div>
    </main>
  );
}
