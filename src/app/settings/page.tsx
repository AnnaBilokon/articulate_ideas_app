import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/supabase";
import { AppearanceSettings } from "./appearance-settings";
import { DailyCapSetting } from "./daily-cap-setting";

export default async function SettingsPage() {
  await connection(); // The saved limit can change.
  const { data: settings } = await db().from("settings").select("daily_review_cap").eq("id", 1).maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Settings" description="Your daily reviews, and how the app looks." />
      <DailyCapSetting cap={settings?.daily_review_cap ?? 10} />
      <AppearanceSettings />
    </main>
  );
}
