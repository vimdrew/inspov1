import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { ENV } from "varlock/env";

import { SocialSignInButtons } from "#/components/sign-in-social-buttons.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";

import { InputStyled } from "../../components/ui/styled-input";

export const Route = createFileRoute("/_guest/login")({
  component: LoginForm,
});

function LoginForm() {
  const { redirectUrl } = Route.useRouteContext();

  const { mutate: emailLoginMutate, isPending } = useMutation({
    mutationFn: async (data: { email: string; password: string }) =>
      await authClient.signIn.email(
        {
          ...data,
          callbackURL: redirectUrl,
        },
        {
          onError: ({ error }) => {
            toast.add({
              type: "error",
              description: error.message || "An error occurred while signing in.",
            });
          },
          // better-auth seems to trigger a hard navigation on login,
          // so we don't have to revalidate & navigate ourselves
          // onSuccess: () => {
          //   queryClient.removeQueries({ queryKey: authQueryOptions().queryKey });
          //   navigate({ to: redirectUrl });
          // },
        },
      ),
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) return;

    emailLoginMutate({ email, password });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="astloch-bold mx-auto text-2xl md:text-3xl">Welcome.</h1>
      <form onSubmit={handleSubmit} aria-busy={isPending}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <InputStyled id="email" name="email" type="email" />
            </div>
            <div className="grid gap-2">
              <InputStyled id="password" name="password" type="password" />
            </div>
            <div className="flex w-full flex-col items-center space-y-4">
              <Button
                type="submit"
                className="agdasima-regular mt-2 w-full rounded-[5px] uppercase"
                size="lg"
                disabled={isPending}
              >
                {isPending && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
                {isPending ? "Logging in..." : "Log in"}
              </Button>
              <Link
                to="/signup"
                className="agdasima-regular mx-auto text-sm uppercase underline underline-offset-3 hover:no-underline"
              >
                Don't have an account?
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
