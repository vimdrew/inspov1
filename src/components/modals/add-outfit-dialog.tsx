import { UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { toast } from "#/components/ui/toast";
import { cn } from "#/lib/utils";

import { Button } from "../ui/button";
import { InputStyled } from "../ui/styled-input";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

type SelectedImage = {
  file: File;
  url: string;
};

export const AddOutfitDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<SelectedImage | null>(null);

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

  const clearImage = () => {
    setImage((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  };

  const resetState = () => {
    setName("");
    setDragActive(false);
    clearImage();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      resetState();
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.add({
        type: "error",
        description: "Only image files can be added.",
      });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.add({
        type: "error",
        description: "Image is too large. Keep it under 10 MB.",
      });
      return;
    }
    setImage((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return { file, url: URL.createObjectURL(file) };
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

  const handleSave = () => {
    if (!name.trim()) {
      toast.add({
        type: "error",
        description: "Give your outfit a name first.",
      });
      return;
    }
    if (!image) {
      toast.add({
        type: "error",
        description: "Add a photo of your outfit first.",
      });
      return;
    }
    toast.add({ type: "success", description: "Outfit saved." });
    resetState();
    setOpen(false);
  };

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
                "fixed bottom-4 left-1/2 aspect-square h-12 -translate-x-1/2 rounded-sm hover:scale-94"
              }
            />
          }
        />
        <DialogContent
          className={"no-scrollbar h-[80svh] max-h-[90vh] overflow-y-auto rounded-xs lg:max-w-2xl"}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <DialogHeader>
              <DialogTitle className={"astloch-bold mx-auto text-3xl"}>Add Outfit</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
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
                      className="absolute inset-0 h-full max-h-full w-full rounded-sm object-contain lg:hidden"
                    />
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
                <InputStyled
                  className="bg-[#e9e6e1]"
                  name="Outfit Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button
                  className={"agdasima-bold h-9 rounded-xs text-xs uppercase"}
                  onClick={handleSave}
                >
                  Save Outfit
                </Button>
              </div>
              <div className="relative hidden min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-xs border bg-[#e9e6e1] p-4 text-black lg:flex">
                {image ? (
                  <img
                    src={image.url}
                    alt="Selected outfit"
                    className="absolute inset-0 h-full max-h-full w-full rounded-xs object-contain"
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
              </div>
            </div>
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
