import { SettingsTabs } from "@/features/settings/settings-tabs";
import { requireRole } from "@/lib/auth";

export default async function SettingsLayout(props: LayoutProps<"/settings">) {
  await requireRole("owner", "admin");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Pengaturan</h1>
      <SettingsTabs />
      {props.children}
    </div>
  );
}
