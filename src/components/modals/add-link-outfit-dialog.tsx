import { useForm } from "@tanstack/react-form";
import { noop } from "@tanstack/react-query";
import { CheckIcon, DicesIcon, LinkIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { toast } from "#/components/ui/toast";
import {
  $deleteOrphanImage,
  $importOutfitImage,
  $resolveOutfitLink,
} from "#/lib/outfits/functions.ts";
import { randomOutfitName } from "#/lib/outfits/random-name.ts";
import { useCreateOutfit } from "#/lib/outfits/use-create-outfit.ts";
import { cn } from "#/lib/utils";

import { Button } from "../ui/button";
import { InputStyled } from "../ui/styled-input";

const linkSchema = z.object({
  name: z.string().min(1, "Give your outfits a name").max(120),
});

type SlideState = "idle" | "importing" | "done" | "failed";

type Slide = {
  url: string;
  selected: boolean;
  state: SlideState;
};

export const AddLinkOutfitDialog = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"link" | "select">("link");
  const [url, setUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [totalImport, setTotalImport] = useState(0);

  const createMutation = useCreateOutfit();

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: linkSchema },
    onSubmit: ({ value }) => {
      void startImport(value.name);
    },
  });

  const selectedCount = slides.filter((s) => s.selected && s.state !== "done").length;

  const resetState = () => {
    form.reset();
    setUrl("");
    setStep("link");
    setLinkError(null);
    setSlides([]);
    setDegraded(false);
    setImporting(false);
    setImportedCount(0);
    setTotalImport(0);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && importing) return;
    setOpen(next);
    if (!next) resetState();
  };

  const resolve = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setLinkError("Paste a link first.");
      return;
    }
    setResolving(true);
    setLinkError(null);
    try {
      const resolved = await $resolveOutfitLink({ data: { url: trimmed } });
      setSlides(
        resolved.images.map((imageUrl) => ({ url: imageUrl, selected: true, state: "idle" })),
      );
      setDegraded(resolved.degraded);
      if (!form.getFieldValue("name").trim()) {
        form.setFieldValue("name", randomOutfitName());
      }
      setStep("select");
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "We couldn't load that link.");
    } finally {
      setResolving(false);
    }
  };

  const toggleSlide = (index: number) => {
    setSlides((prev) =>
      prev.map((slide, i) => {
        if (i !== index) return slide;
        if (slide.state === "importing" || slide.state === "done") return slide;
        if (slide.state === "failed") return { ...slide, selected: true, state: "idle" };
        return { ...slide, selected: !slide.selected };
      }),
    );
  };

  const setAll = (selected: boolean) => {
    setSlides((prev) =>
      prev.map((slide) => {
        if (slide.state === "done") return slide;
        if (slide.state === "failed") return { ...slide, selected, state: "idle" };
        return { ...slide, selected };
      }),
    );
  };

  const startImport = async (name: string) => {
    if (selectedCount === 0) return;
    setImporting(true);
    setImportedCount(0);
    setTotalImport(selectedCount);

    let added = 0;
    let failed = 0;

    for (let index = 0; index < slides.length; index++) {
      const slide = slides[index];
      if (!slide.selected || slide.state === "done") continue;

      setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, state: "importing" } : s)));

      let uploadedUrl: string | null = null;
      try {
        const result = await $importOutfitImage({ data: { imageUrl: slide.url } });
        uploadedUrl = result.imageUrl;
        await createMutation.mutateAsync({
          name: index === 0 ? name : `${name} ${index + 1}`,
          imageUrl: uploadedUrl,
        });
        added += 1;
        setImportedCount(added);
        setSlides((prev) =>
          prev.map((s, i) => (i === index ? { ...s, selected: false, state: "done" as const } : s)),
        );
      } catch {
        if (uploadedUrl) {
          void $deleteOrphanImage({ data: { imageUrl: uploadedUrl } }).catch(noop);
        }
        failed += 1;
        setSlides((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, selected: false, state: "failed" as const } : s,
          ),
        );
      }
    }

    setImporting(false);

    if (failed === 0) {
      toast.add({
        type: "success",
        description: added === 1 ? "Outfit added." : `${added} outfits added.`,
      });
      handleOpenChange(false);
    } else if (added > 0) {
      toast.add({
        type: "error",
        description: `${added} of ${added + failed} added. We couldn't import the rest.`,
      });
    } else {
      toast.add({ type: "error", description: "We couldn't import those photos." });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              type="button"
              aria-label="Add outfit link"
              variant="outline"
              className="fixed bottom-4 left-1/2 z-20 h-10 w-10 -translate-x-[4.75rem] rounded-none border-border bg-background/80 text-foreground/80 backdrop-blur"
            >
              <LinkIcon />
            </Button>
          }
        />
        <DialogContent className="no-scrollbar max-h-[85vh] overflow-y-auto rounded-none lg:max-w-2xl">
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <DialogHeader>
              <DialogTitle className={"astloch-bold mx-auto text-3xl"}>Add from Link</DialogTitle>
              <DialogDescription className="agdasima-regular mx-auto text-sm uppercase">
                Grab photos from a TikTok post, Instagram post, or a direct image link.
              </DialogDescription>
            </DialogHeader>

            {step === "link" ? (
              <div className="flex flex-col gap-4">
                <InputStyled
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  name="Link"
                  placeholder="https://…"
                  className="bg-[#e9e6e1]"
                />
                {linkError ? <p className="text-[10px] text-red-500">{linkError}</p> : null}
                <Button
                  type="button"
                  onClick={() => void resolve()}
                  disabled={resolving}
                  className="agdasima-bold h-9 rounded-none text-xs uppercase disabled:opacity-50"
                >
                  {resolving ? (
                    <>
                      <Loader2Icon size={16} strokeWidth={3} className="animate-spin" />
                      Looking for photos…
                    </>
                  ) : (
                    "Find photos"
                  )}
                </Button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
                className="flex min-h-0 flex-1 flex-col gap-5"
              >
                {degraded ? (
                  <p className="agdasima-regular text-xs tracking-wider text-muted-foreground uppercase">
                    We could only load the first photo from this link.
                  </p>
                ) : null}

                <div className="flex items-center justify-between">
                  <p className="agdasima-regular text-xs tracking-widest uppercase">
                    Photos to import
                  </p>
                  <button
                    type="button"
                    onClick={() => setAll(selectedCount !== slides.length)}
                    className="agdasima-regular text-xs tracking-widest uppercase underline-offset-2 hover:underline"
                  >
                    {selectedCount === slides.length ? "Select none" : "Select all"}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.url}
                      type="button"
                      onClick={() => toggleSlide(index)}
                      disabled={importing}
                      className={cn(
                        "relative aspect-[3/4] overflow-hidden rounded-none border",
                        slide.selected && "border-2 border-black",
                        slide.state === "failed" && "border-red-500",
                      )}
                    >
                      <img
                        src={slide.url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {slide.selected ? (
                        <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-none bg-black text-white">
                          <CheckIcon size={14} strokeWidth={3} />
                        </span>
                      ) : null}
                      {slide.state === "importing" ? (
                        <span className="absolute inset-0 grid place-items-center bg-black/50 text-white">
                          <Loader2Icon size={20} strokeWidth={3} className="animate-spin" />
                        </span>
                      ) : null}
                      {slide.state === "failed" ? (
                        <span className="absolute inset-x-0 bottom-0 bg-red-500 px-1 py-0.5 text-center text-[10px] text-white uppercase">
                          Didn't import
                        </span>
                      ) : null}
                      {slide.state === "done" ? (
                        <span className="absolute inset-0 bg-black/40" />
                      ) : null}
                    </button>
                  ))}
                </div>

                <div className="grid gap-2">
                  <form.Field
                    name="name"
                    children={(field) => {
                      return (
                        <div className="grid gap-2">
                          <div className="flex items-start gap-2">
                            <InputStyled
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                              id="link-outfit-name"
                              name="Name"
                              placeholder="Summer fit, Date night…"
                              className="bg-[#e9e6e1]"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              aria-label="Suggest a name"
                              onClick={() => form.setFieldValue("name", randomOutfitName())}
                              className="h-12 w-10 shrink-0 rounded-none border-border px-0"
                            >
                              <DicesIcon size={16} strokeWidth={3} />
                            </Button>
                          </div>
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-[10px] text-red-500">
                              {field.state.meta.errors[0]?.message}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={importing || selectedCount === 0}
                  className="agdasima-bold h-9 rounded-none text-xs uppercase disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2Icon size={16} strokeWidth={3} className="animate-spin" />
                      Importing {importedCount} of {totalImport}…
                    </>
                  ) : (
                    `Import ${selectedCount === 1 ? "outfit" : `${selectedCount} outfits`}`
                  )}
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
