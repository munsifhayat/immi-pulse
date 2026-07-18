/**
 * Wrapper for the surviving `/community/journey/<id>` pages.
 *
 * `/community` itself now redirects to the room at `/`, but the per-journey
 * pages stay exactly where they are: they are indexed, they are in the sitemap,
 * and each one is a long-tail landing page for someone searching whether their
 * subclass is taking too long. Moving them would throw that away.
 *
 * This layout deliberately carries no metadata — each journey page generates
 * its own title, description and canonical from the post itself.
 */
export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
