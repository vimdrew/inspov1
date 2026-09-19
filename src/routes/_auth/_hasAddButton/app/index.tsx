import { createFileRoute } from "@tanstack/react-router";

import { useAuthSuspense } from "#/lib/auth/hooks.ts";

export const Route = createFileRoute("/_auth/_hasAddButton/app/")({
  component: AppIndex,
});

function AppIndex() {
  const { user } = useAuthSuspense();

  return <div className="flex flex-col items-center gap-3 text-center text-sm"></div>;
}
