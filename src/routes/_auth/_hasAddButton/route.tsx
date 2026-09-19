import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AddOutfitDialog } from "../../../components/modals/add-outfit-dialog";

export const Route = createFileRoute("/_auth/_hasAddButton")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <AddOutfitDialog />
      <Outlet />
    </>
  );
}
