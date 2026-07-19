import { CommunityShell } from "@/components/community/community-shell";

/**
 * The app shell.
 *
 * Every route in this group lands *inside* the community: a static left rail, a
 * centre column that is the only thing that scrolls, and a static right rail.
 * There is no marketing navbar and no site footer here on purpose — the footer
 * links live in the right rail, and the chrome of a website is exactly what a
 * platform is not.
 */
export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommunityShell>{children}</CommunityShell>;
}
