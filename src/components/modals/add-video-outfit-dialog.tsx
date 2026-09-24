import { useForm } from "@tanstack/react-form";
import { CheckIcon, Loader2Icon, VideoIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
  clearSharedUrl,
  getSharedRoute,
  getSharedUrl,
  subscribeSharedUrl,
} from "#/lib/capacitor/shared-link-store.ts";
import {
  $deleteOrphanImage,
  $importOutfitFrame,
  $resolveVideoLink,
} from "#/lib/outfits/functions.ts";
import { randomOutfitName } from "#/lib/outfits/random-name.ts";
import { useCreateOutfit } from "#/lib/outfits/use-create-outfit.ts";
import { captureVideoFrames } from "#/lib/outfits/video-capture.ts";
import { cn } from "#/lib/utils";

import { Button } from "../ui/button";
import { InputStyled } from "../ui/styled-input";

const videoNameSchema = z.object({
  name: z.string().min(1, "Give your outfit a name").max(120),
});

const MAX_FRAMES = 10;

export const AddVideoOutfitDialog = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"link" | "frames">("link");
  const [url, setUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  const createMutation = useCreateOutfit();

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: videoNameSchema },
    onSubmit: ({ value }) => {
      void startImport(value.name);
    },
  });

  const resetState = () => {
    form.reset();
    setUrl("");
    setStep("link");
    setLinkError(null);
    setFrames([]);
    setSelected(null);
    setImporting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && importing) return;
    setOpen(next);
    if (!next) resetState();
  };

  useEffect(() => {
    const consumeSharedUrl = () => {
      const pending = getSharedUrl();
      if (!pending || getSharedRoute() !== "video") return;
      clearSharedUrl();
      setUrl(pending);
      setStep("link");
      setOpen(true);
    };
    consumeSharedUrl();
    return subscribeSharedUrl(consumeSharedUrl);
  }, []);

  const resolve = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setLinkError("Paste a link first.");
      return;
    }
    setResolving(true);
    setLinkError(null);
    try {
      const { videoUrl } = await $resolveVideoLink({ data: { url: trimmed } });
      const frames = await captureVideoFrames(videoUrl, MAX_FRAMES);
      if (frames.length === 0) {
        throw new Error("We couldn't grab any frames from that video.");
      }
      if (!form.getFieldValue("name").trim()) {
        form.setFieldValue("name", randomOutfitName());
      }
      setFrames(frames);
      setSelected(0);
      setStep("frames");
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "We couldn't load that video.");
    } finally {
      setResolving(false);
    }
  };

  const startImport = async (name: string) => {
    if (selected === null) return;
    setImporting(true);
    const frame = frames[selected];
    const imageBase64 = frame.slice(frame.indexOf(",") + 1);

    let uploadedUrl: string | null = null;
    try {
      const result = await $importOutfitFrame({
        data: { imageBase64, contentType: "image/jpeg" },
      });
      uploadedUrl = result.imageUrl;
      await createMutation.mutateAsync({ name, imageUrl: uploadedUrl });
      toast.add({ type: "success", description: "Outfit added." });
      handleOpenChange(false);
    } catch {
      if (uploadedUrl) {
        void $deleteOrphanImage({ data: { imageUrl: uploadedUrl } }).catch(() => {});
      }
      toast.add({ type: "error", description: "We couldn't import that frame." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              type="button"
              aria-label="Add outfit video"
              variant="outline"
              className="fixed bottom-4 left-1/2 z-20 h-10 w-10 translate-x-[2.25rem] rounded-none border-border bg-background/80 text-foreground/80 backdrop-blur"
            >
              <VideoIcon />
            </Button>
          }
        />
        <DialogContent className="no-scrollbar max-h-[85vh] overflow-y-auto rounded-none lg:max-w-2xl">
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <DialogHeader>
              <DialogTitle className={"astloch-bold mx-auto text-3xl"}>Add from Video</DialogTitle>
              <DialogDescription className="agdasima-regular mx-auto text-sm uppercase">
                Pick a frame from a TikTok video or a Reel to use as your outfit photo.
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
                      Finding frames…
                    </>
                  ) : (
                    "Find frames"
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
                <div className="flex items-center justify-between">
                  <p className="agdasima-regular text-xs tracking-widest uppercase">Pick a frame</p>
                  <p className="agdasima-regular text-xs tracking-widest text-muted-foreground uppercase">
                    {selected === null ? "None selected" : `${selected + 1} of ${frames.length}`}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {frames.map((frame, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelected(selected === index ? null : index)}
                      disabled={importing}
                      aria-pressed={selected === index}
                      className={cn(
                        "relative aspect-[3/4] overflow-hidden rounded-none border",
                        selected === index && "border-2 border-black",
                      )}
                    >
                      <img
                        src={frame}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {selected === index ? (
                        <span className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-none bg-black text-white">
                          <CheckIcon size={14} strokeWidth={3} />
                        </span>
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
                          <InputStyled
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            id="video-outfit-name"
                            name="Name"
                            placeholder="Summer fit, Date night…"
                            className="bg-[#e9e6e1]"
                          />
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
                  disabled={importing || selected === null}
                  className="agdasima-bold h-9 rounded-none text-xs uppercase disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2Icon size={16} strokeWidth={3} className="animate-spin" />
                      Importing…
                    </>
                  ) : (
                    "Import outfit"
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
