import type { PluginListenerHandle } from "@capacitor/core";
import { a11yDevtoolsPlugin } from "@tanstack/devtools-a11y/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useRef } from "react";

import { ThemeProvider } from "#/components/theme-provider.tsx";
import { Toaster } from "#/components/ui/toast.tsx";
import { getSharedUrl, setSharedUrl } from "#/lib/capacitor/shared-link-store.ts";
import { $resolveSharedLink } from "#/lib/outfits/functions.ts";
import { sharedRouteHint } from "#/lib/outfits/link-parsers.ts";
import { extractSharedUrl } from "#/lib/outfits/shared-link.ts";

import appCss from "#/styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Typically we don't need the user immediately in landing pages.
  // For protected routes, see /_auth/route.tsx
  // beforeLoad: ({ context }) => {
  //   void context.queryClient.query(authQueryOptions()).catch(noop);
  // },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "inspov1",
      },
      {
        name: "description",
      },
    ],
    links: [
      // Replace with your icons here, or remove if you have a favicon.ico in public/
      {
        rel: "icon",
        href: "/logo.svg",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
});

let lastHandledUrl: string | null = null;

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const shareListenerRef = useRef<PluginListenerHandle | null>(null);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (disposed || !Capacitor.isNativePlatform()) return;
      if (!Capacitor.isPluginAvailable("CapacitorShareTarget")) return;

      const { CapacitorShareTarget } = await import("@capgo/capacitor-share-target");
      if (disposed) return;

      const handle = await CapacitorShareTarget.addListener("shareReceived", (event) => {
        for (const text of event.texts) {
          const url = extractSharedUrl(text);
          if (!url || url === lastHandledUrl || url === getSharedUrl()) continue;
          lastHandledUrl = url;

          const route = sharedRouteHint(url);
          if (route) {
            setSharedUrl(url, route);
          } else {
            void $resolveSharedLink({ data: { url } })
              .then((resolved) => setSharedUrl(url, resolved))
              .catch(() => setSharedUrl(url, "link"));
          }

          if (router.state.location.pathname !== "/") {
            void router.navigate({ to: "/" });
          }
          return;
        }
      });

      if (disposed) {
        await handle.remove().catch(() => {});
        return;
      }
      shareListenerRef.current = handle;
    })();

    return () => {
      disposed = true;
      const handle = shareListenerRef.current;
      shareListenerRef.current = null;
      if (handle) void handle.remove().catch(() => {});
    };
  }, [router]);

  return (
    // suppress since we're updating the "dark" class in ThemeProvider
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>

        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            a11yDevtoolsPlugin(),
          ]}
        />

        <Scripts />
      </body>
    </html>
  );
}
