import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { speakingProfile } from "@/lib/speaking";
import { ProfileForm } from "../profile-form";

export default async function SpeakingProfilePage() {
  await connection();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Your goals and topics"
        description="The coach uses these for every scene and every piece of feedback."
        back={{ href: "/speaking", label: "Speaking coach" }}
      />
      <ProfileForm initial={await speakingProfile()} />
    </main>
  );
}
