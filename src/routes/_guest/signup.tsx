import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { email, z } from "zod";

import { SocialSignInButtons } from "#/components/sign-in-social-buttons.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";
import { authQueryOptions } from "#/lib/auth/queries.ts";

import { InputStyled } from "../../components/ui/styled-input";

export const Route = createFileRoute("/_guest/signup")({
  component: SignupForm,
});

export const SignUpSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(3, "3 characters or more")
      .max(30, "Exceeded max characters: 30"),
    email: z.email("Valid email address required"),
    password: z
      .string()
      .min(8, "8 characters or more")
      .max(72, "Exceeded max characters: 72")
      .regex(/[a-z]/, "Must include a lowercase letter")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[0-9]/, "Must include a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function SignupForm() {
  const { redirectUrl } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onChange: SignUpSchema,
    },
    onSubmit: async ({ value }) => {
      signupMutate(value);
      console.log(value);
    },
  });

  const { mutate: signupMutate, isPending } = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      await authClient.signUp.email(
        {
          ...data,
          callbackURL: redirectUrl,
        },
        {
          onError: ({ error }) => {
            toast.add({
              type: "error",
              description: error.message || "An error occurred while signing up.",
            });
          },
          onSuccess: () => {
            queryClient.removeQueries({
              queryKey: authQueryOptions().queryKey,
            });
            navigate({ to: redirectUrl });
          },
        },
      );
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="astloch-bold mx-auto text-2xl md:text-3xl">Join us.</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        aria-busy={isPending}
      >
        <div className="flex flex-col gap-6">
          <form.Field
            name="name"
            children={(field) => {
              return (
                <div className="grid gap-2">
                  <InputStyled
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    id="name"
                    name="name"
                    type="text"
                  />
                </div>
              );
            }}
          />
          <form.Field
            name="email"
            children={(field) => {
              return (
                <div className="grid gap-2">
                  <InputStyled
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    id="email"
                    name="email"
                    type="text"
                  />
                </div>
              );
            }}
          />

          <form.Field
            name="password"
            children={(field) => {
              return (
                <div className="grid gap-2">
                  <InputStyled
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    id="password"
                    name="password"
                    type="password"
                  />
                </div>
              );
            }}
          />

          <form.Field
            name="confirmPassword"
            children={(field) => {
              return (
                <div className="grid gap-2">
                  <InputStyled
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    id="confirmPassword"
                    name="confirm password"
                    type="password"
                  />
                </div>
              );
            }}
          />
          <div className="flex flex-col gap-5">
            <div className="flex w-full flex-col items-center space-y-4">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    className="mt-2 w-full rounded-[5px] text-xs uppercase"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting && (
                      <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
                    )}
                    {isSubmitting ? "Signing up..." : "Sign up"}
                  </Button>
                )}
              />
              <Link
                to="/login"
                className="agdasima-regular mx-auto text-sm uppercase underline underline-offset-3 hover:no-underline"
              >
                Already have a account?
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
