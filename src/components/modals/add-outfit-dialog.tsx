import { useForm } from "@tanstack/react-form";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import z from "zod";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { toast } from "#/components/ui/toast";
import { $deleteOrphanImage, $removeOutfitBackground } from "#/lib/outfits/functions.ts";
import {
  MAX_IMAGE_SIZE,
  type SelectedImage,
  base64ToBlob,
  toBase64,
  uploadToCloudinary,
} from "#/lib/outfits/upload.ts";
import { useCreateOutfit } from "#/lib/outfits/use-create-outfit.ts";
import { cn } from "#/lib/utils";

import { Button } from "../ui/button";
import { InputStyled } from "../ui/styled-input";

const createOutfitSchema = z.object({
  name: z.string().min(1, "Give your outfit a name"),
});

export const AddOutfitDialog = () => {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<SelectedImage | null>(null);
  const createMutation = useCreateOutfit();

  useEffect(() => {
    imageRef.current = image;
  }, [image]);

  useEffect(() => {
    return () => {
      if (imageRef.current) {
        URL.revokeObjectURL(imageRef.current.url);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const preventDefault = (event: DragEvent) => event.preventDefault();
    document.addEventListener("dragover", preventDefault);
    document.addEventListener("drop", preventDefault);
    return () => {
      document.removeEventListener("dragover", preventDefault);
      document.removeEventListener("drop", preventDefault);
    };
  }, [open]);

  const abandonCurrentImage = () => {
    const img = imageRef.current;
    if (!img) return;
    img.upload
      .then(({ secureUrl }) => $deleteOrphanImage({ data: { imageUrl: secureUrl } }))
      .catch(() => {});
  };

  const clearImage = () => {
    setImage((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  };

  const resetState = () => {
    form.reset();
    setDragActive(false);
    setImageError(null);
    clearImage();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      abandonCurrentImage();
      resetState();
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Only image files can be added.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image is too large. Keep it under 10 MB.");
      return;
    }
    setImageError(null);
    abandonCurrentImage();
    const originalUrl = URL.createObjectURL(file);
    const upload = (async () => {
      let target = file;
      let previewUrl = originalUrl;
      try {
        const base64 = toBase64(await file.arrayBuffer());
        const { imageBase64 } = await $removeOutfitBackground({
          data: { name: file.name, type: file.type, imageBase64: base64 },
        });
        if (imageBase64) {
          target = new File([base64ToBlob(imageBase64, "image/png")], `${file.name}.png`, {
            type: "image/png",
          });
          previewUrl = URL.createObjectURL(target);
        }
      } catch {
        // Background removal unavailable — fall back to the original image.
      }
      setImage((prev) => {
        if (prev && prev.url !== previewUrl) {
          URL.revokeObjectURL(prev.url);
        }
        return prev ? { ...prev, url: previewUrl, status: "uploading" } : prev;
      });
      return uploadToCloudinary(target).catch(() => {
        toast.add({ type: "error", description: "Image upload failed." });
        throw new Error("Image upload failed");
      });
    })();
    setImage((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return { file, url: originalUrl, status: "processing", upload };
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onChange: createOutfitSchema,
    },
    onSubmit: async ({ value }) => {
      const img = imageRef.current;
      if (!img) {
        setImageError("Add a photo of your outfit first.");
        return;
      }
      setSaving(true);
      try {
        const { secureUrl } = await img.upload;
        await createMutation.mutateAsync({ name: value.name, imageUrl: secureUrl });
        img.status = "saved";
        imageRef.current = null;
        resetState();
        setOpen(false);
        toast.add({ type: "success", description: "Outfit saved." });
      } catch {
        toast.add({ type: "error", description: "Could not save your outfit. Try again." });
      } finally {
        setSaving(false);
      }
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              style={{
                backgroundImage: 'url("/stylized-plus.svg")',
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "50%",
                backgroundColor: "#1A1030",
              }}
              variant={"secondary"}
              className={
                "fixed bottom-4 left-1/2 aspect-square h-12 -translate-x-1/2 rounded-none hover:scale-94"
              }
            />
          }
        />
        <DialogContent
          className={
            "no-scrollbar h-[80svh] max-h-[90vh] overflow-y-auto rounded-none lg:max-w-2xl"
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <DialogHeader>
              <DialogTitle className={"astloch-bold mx-auto text-3xl"}>Add Outfit</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <input
                  ref={inputRef}
                  id="outfit-photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className={cn(
                    "relative flex min-h-0 w-full flex-1 cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden border border-dashed border-black bg-[#e9e6e1]",
                    dragActive && "border-solid ring-2 ring-black/30",
                  )}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {image ? (
                    <img
                      src={image.url}
                      alt="Selected outfit"
                      className="absolute inset-0 h-full max-h-full w-full rounded-none object-contain lg:hidden"
                    />
                  ) : null}
                  {image?.status === "processing" ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#e9e6e1]/80 lg:hidden">
                      <Loader2Icon size={18} strokeWidth={3} className="animate-spin" />
                      <span className="agdasima-regular text-xs tracking-widest uppercase">
                        Removing background…
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "pointer-events-none flex flex-col items-center justify-center gap-4",
                      image && "hidden lg:flex",
                    )}
                  >
                    <UploadIcon size={18} strokeWidth={3} />
                    <span className="agdasima-regular text-xs tracking-widest uppercase">
                      Drop Photos or click to upload
                    </span>
                  </div>
                </button>
                {imageError ? <p className="text-[10px] text-red-500">{imageError}</p> : null}

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
                          name="Outfit Name"
                          className="bg-[#e9e6e1]"
                          type="text"
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
                <Button
                  type="submit"
                  disabled={saving}
                  className={"agdasima-bold h-9 rounded-none text-xs uppercase disabled:opacity-50"}
                >
                  Save Outfit
                </Button>
              </div>
              <div className="relative hidden min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-none border bg-[#e9e6e1] p-4 text-black lg:flex">
                {image ? (
                  <img
                    src={image.url}
                    alt="Selected outfit"
                    className="absolute inset-0 h-full max-h-full w-full rounded-none object-contain"
                  />
                ) : (
                  <>
                    <span className="agdasima-regular text-xl tracking-widest uppercase">
                      Preview
                    </span>
                    <span className="agdasima-regular text-sm uppercase opacity-80">
                      Your outfit will show up here
                    </span>
                  </>
                )}
                {image?.status === "processing" ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#e9e6e1]/80">
                    <Loader2Icon size={18} strokeWidth={3} className="animate-spin" />
                    <span className="agdasima-regular text-xs tracking-widest uppercase">
                      Removing background…
                    </span>
                  </div>
                ) : null}
              </div>
            </form>
            <span className="agdasima-regular mx-auto text-sm font-light tracking-wider uppercase opacity-50">
              Changed your mind?{" "}
              <DialogClose className={"uppercase underline-offset-2 hover:underline"}>
                Cancel
              </DialogClose>
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
