import { Link } from "@tanstack/react-router";

import { Button } from "./ui/button";

export function DefaultNotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      <p className="agdasima-regular text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Inspo &gt; Nowhere
      </p>
      <h1 className="agdasima-bold mt-6 text-9xl leading-none tracking-[0.06em] uppercase select-none md:text-[12rem]">
        404
      </h1>
      <p className="agdasima-regular mt-8 max-w-sm text-sm leading-relaxed tracking-[0.2em] text-muted-foreground uppercase">
        Sorry, that page isn&apos;t here. It may have moved or never existed.
      </p>
      <div className="mt-10 flex items-center gap-3">
        <Button type="button" onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button render={<Link to="/" />} variant="outline" nativeButton={false}>
          Home
        </Button>
      </div>
    </main>
  );
}
