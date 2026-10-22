import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EXERCISES_PER_DAY, SPEAKING_PLAN, speakingSkillInfo } from "@/lib/schemas";
import { speakingOverview, speakingProfile } from "@/lib/speaking";
import { cn } from "@/lib/utils";
import { ProfileForm } from "./profile-form";
import { StartExercise } from "./start-exercise";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

// The speaking coach: set up once, then one exercise at a time through 14
// practice days that repeat in rounds. Progress is what's done; no scores.
export default async function SpeakingPage() {
  await connection();
  const profile = await speakingProfile();

  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <PageHeader
          title="Speaking coach"
          description="Practise speaking English clearly and spontaneously, one short scene at a time. No scores, no judgement: just steady practice."
        />
        <ProfileForm initial={null} />
      </main>
    );
  }

  const overview = await speakingOverview();
  const today = SPEAKING_PLAN[overview.day - 1];
  const { round, doneToday } = overview;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Speaking coach" description="One short scene at a time. Speak, get feedback, use a new expression.">
        <Link href="/speaking/profile" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Settings2 className="size-4" /> Your goals and topics
        </Link>
      </PageHeader>

      <Card className="ring-primary/20">
        <CardHeader>
          <CardDescription>
            {round > 1 && `Round ${round} · `}Day {today.day} of 14 · {speakingSkillInfo[today.skill].label}
          </CardDescription>
          <CardTitle className="text-xl text-heading">{today.title}</CardTitle>
          <CardDescription>{today.technique}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-label={`${doneToday} of ${EXERCISES_PER_DAY} exercises done`}>
            {Array.from({ length: EXERCISES_PER_DAY }, (_, i) => (
              <span key={i} className={cn("size-2.5 rounded-full", i < doneToday ? "bg-primary" : "bg-muted ring-1 ring-border")} />
            ))}
            <span>
              {doneToday} of {EXERCISES_PER_DAY} for this day. Take as long as you like: the plan waits for you.
            </span>
          </div>
          {overview.open ? (
            <Link href={`/speaking/exercises/${overview.open.id}`} className={cn(buttonVariants({ size: "lg" }), "h-10 w-fit px-4")}>
              Continue your exercise <ArrowRight className="size-4" />
            </Link>
          ) : (
            <StartExercise topics={profile.topics} />
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight text-heading">Round {round}</h2>
          <p className="text-sm text-muted-foreground">
            After day 14 the plan starts again, with harder questions each round.
          </p>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-7">
          {SPEAKING_PLAN.map((d) => {
            const done = d.day < today.day ? EXERCISES_PER_DAY : d.day === today.day ? doneToday : 0;
            const current = d.day === today.day;
            return (
              <li
                key={d.day}
                className={cn(
                  "flex flex-col gap-1 rounded-xl p-2.5 text-xs",
                  current ? "bg-card ring-2 ring-primary" : done >= EXERCISES_PER_DAY ? "bg-success-soft text-success-foreground" : "bg-muted/60",
                )}
                title={d.technique}
              >
                <span className="font-semibold">Day {d.day}</span>
                <span className="leading-4">{d.title}</span>
                <span className="flex gap-1 pt-0.5" aria-label={`${Math.min(done, EXERCISES_PER_DAY)} of ${EXERCISES_PER_DAY} done`}>
                  {Array.from({ length: EXERCISES_PER_DAY }, (_, i) => (
                    <span key={i} className={cn("size-1.5 rounded-full", i < done ? "bg-current" : "bg-foreground/15")} />
                  ))}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { value: overview.done, label: "exercises done" },
          { value: overview.saved.length, label: "expressions saved" },
          { value: overview.reused, label: "times you used one again" },
        ].map(({ value, label }) => (
          <Card key={label} size="sm">
            <CardContent className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold tabular-nums text-heading">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      {overview.saved.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-heading">Your expressions</h2>
            <Link href="/speaking/expressions" className="text-sm text-muted-foreground hover:text-foreground">
              See all {overview.saved.length}
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {overview.saved.slice(0, 12).map((s) => (
              <li key={s.id} className="rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground">
                {s.expression}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">New exercises bring these back, so you get to use them in other situations.</p>
        </section>
      )}

      {overview.recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-heading">Recent exercises</h2>
          <ul className="flex flex-col gap-2">
            {overview.recent.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/speaking/exercises/${e.id}`}
                  className="group flex items-center gap-3 rounded-xl bg-muted/60 p-3 text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{e.question}</span>
                    <span className="text-muted-foreground">
                      Day {e.day} · {e.topic} · {dateFormat.format(new Date(e.createdAt))}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
