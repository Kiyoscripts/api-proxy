import { AppShell } from "@/components/app-shell";
import { Topbar } from "@/components/topbar";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <AppShell topbar={<Topbar />}>
      {children}
    </AppShell>
  );
}
