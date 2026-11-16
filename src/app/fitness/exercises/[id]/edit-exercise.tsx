"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exercise } from "@/lib/schemas";
import { ExerciseEditor } from "../exercise-library";

export function EditExercise({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Edit
      </Button>
      {open && <ExerciseEditor existing={exercise} onClose={() => setOpen(false)} onDeleted={() => router.push("/fitness/exercises")} />}
    </>
  );
}
