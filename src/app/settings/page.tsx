import { PageHeader } from "@/components/page-header";
import { AppearanceSettings } from "./appearance-settings";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Settings" description="How the app looks. Your choices are saved in this browser." />
      <AppearanceSettings />
    </main>
  );
}
