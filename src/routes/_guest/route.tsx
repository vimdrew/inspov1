import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authQueryOptions } from "#/lib/auth/queries.ts";

import { Wrapper } from "../../components/wrapper";

export const Route = createFileRoute("/_guest")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    // Redirect path when user is already present,
    // or after successful login/signup
    const REDIRECT_URL = "/app";

    const user = await context.queryClient.query({
      ...authQueryOptions(),
      staleTime: "static",
    });
    void context.queryClient.query(authQueryOptions());

    if (user) {
      throw redirect({
        to: REDIRECT_URL,
      });
    }

    return {
      redirectUrl: REDIRECT_URL,
    };
  },
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <Wrapper>
        <div className="flex w-full max-w-md flex-col gap-8 p-4 md:p-6">
          <Outlet />
        </div>
      </Wrapper>
    </div>
  );
}
