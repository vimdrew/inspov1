import { useForm } from "@tanstack/react-form";
import { noop, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2Icon, PencilIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { InputStyled } from "#/components/ui/styled-input.tsx";
import { toast } from "#/components/ui/toast.tsx";
import {
  $deleteOrphanImage,
  $deleteOutfit,
  $removeOutfitBackground,
  $updateOutfit,
} from "#/lib/outfits/functions.ts";
import { fitImageUrl } from "#/lib/outfits/image-url.ts";
import { outfitsQueryOptions, outfitQueryOptions } from "#/lib/outfits/queries.ts";
import { outfitNameSchema } from "#/lib/outfits/schemas.ts";
import {
  MAX_IMAGE_SIZE,
  type SelectedImage,
  base64ToBlob,
  toBase64,
  uploadToCloudinary,
} from "#/lib/outfits/upload.ts";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/_auth/_hasAddButton/o/$outfitId")({
  loader: ({ context, params }) => {
    void context.queryClient.query(outfitQueryOptions(params.outfitId)).catch(noop);
  },
  head: () => ({
    meta: [
      { title: "Inspo — Outfit" },
      {
        name: "description",
        content: "View a single outfit with full detail.",
      },
    ],
  }),
  component: OutfitDetailPage,
});

const addedAtFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Outfit = {
  id: string;
  name: string;
  image: string | null;
  createdAt: string | Date;
};

function OutfitDetailPage() {
  const { outfitId } = Route.useParams();
  const { data: outfit, isPending } = useQuery(outfitQueryOptions(outfitId));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="min-h-svh bg-background">
      <nav className="agdasima-regular flex items-center gap-2 px-4 pt-6 pb-2 text-xs tracking-[0.2em] uppercase md:px-8">
        <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
          Home
        </Link>
        <span className="text-foreground/30">&gt;</span>
        <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
          Outfits
        </Link>
        <span className="text-foreground/30">&gt;</span>
        <span className="max-w-[14rem] truncate text-foreground">{outfit ? outfit.name : "…"}</span>
      </nav>

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 pt-2 pb-16 md:px-12">
        {isPending ? (
          <DetailSkeleton />
        ) : outfit?.image ? (
          <div className="relative flex max-h-[72svh] w-full items-center justify-center">
            <img
              src={fitImageUrl(outfit.image, 1200)}
              alt={outfit.name}
              className="max-h-[72svh] max-w-full object-contain"
            />
            <OutfitInfoPanel outfit={outfit} className="absolute top-4 left-0 hidden md:block" />
          </div>
        ) : (
          <OutfitEmptyState />
        )}

        {outfit?.image ? <OutfitInfoPanel outfit={outfit} className="mt-6 md:hidden" /> : null}
      </main>

      <OutfitActionButtons
        onEditClick={() => setEditOpen(true)}
        onDeleteClick={() => setConfirmDeleteOpen(true)}
      />
      <EditOutfitDialog
        key={outfit?.name ?? outfit?.id}
        open={editOpen}
        onOpenChange={setEditOpen}
        outfitId={outfitId}
        outfit={outfit}
      />
      <DeleteOutfitDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        outfitId={outfitId}
        outfitName={outfit?.name}
      />
    </div>
  );
}

function OutfitActionButtons({
  onEditClick,
  onDeleteClick,
}: {
  onEditClick: () => void;
  onDeleteClick: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        aria-label="Edit outfit"
        onClick={onEditClick}
        variant="outline"
        className="fixed bottom-4 left-1/2 z-20 h-10 w-10 -translate-x-[4.75rem] rounded-none border-border bg-background/80 text-foreground/50 backdrop-blur hover:text-foreground"
      >
        <PencilIcon />
      </Button>
      <Button
        type="button"
        aria-label="Delete outfit"
        onClick={onDeleteClick}
        variant="destructive"
        className="fixed bottom-4 left-1/2 z-20 h-10 w-10 translate-x-[2.25rem] rounded-none backdrop-blur"
      >
        <Trash2Icon />
      </Button>
    </>
  );
}

function EditOutfitDialog({
  open,
  onOpenChange,
  outfitId,
  outfit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outfitId: string;
  outfit?: Outfit | null;
}) {
  const queryClient = useQueryClient();
  const editMutation = useMutation({
    mutationFn: ({ name, imageUrl }: { name: string; imageUrl: string | undefined }) =>
      $updateOutfit({ data: { outfitId, name, imageUrl } }),
    onMutate: async ({ name, imageUrl }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["outfits"] }),
        queryClient.cancelQueries({ queryKey: ["outfits", outfitId] }),
      ]);
      const prevList = queryClient.getQueryData<Outfit[]>(outfitsQueryOptions().queryKey);
      const prevDetail = queryClient.getQueryData<Outfit | null>(
        outfitQueryOptions(outfitId).queryKey,
      );

      const patch: Partial<Outfit> = { name };
      if (imageUrl) {
        patch.image = imageUrl;
      }

      queryClient.setQueryData<Outfit | null>(outfitQueryOptions(outfitId).queryKey, (prev) =>
        prev ? { ...prev, ...patch } : prev,
      );
      queryClient.setQueryData<Outfit[]>(outfitsQueryOptions().queryKey, (prev) =>
        prev?.map((o) => (o.id === outfitId ? { ...o, ...patch } : o)),
      );

      return { prevList, prevDetail };
    },
    onError: (_error, _vars, context) => {
      if (context?.prevList) {
        queryClient.setQueryData<Outfit[]>(outfitsQueryOptions().queryKey, context.prevList);
      }
      if (context?.prevDetail) {
        queryClient.setQueryData<Outfit | null>(
          outfitQueryOptions(outfitId).queryKey,
          context.prevDetail,
        );
      }
      toast.add({ type: "error", description: "Could not update your outfit. Try again." });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Outfit>(outfitQueryOptions(outfitId).queryKey, updated);
      queryClient.setQueryData<Outfit[]>(outfitsQueryOptions().queryKey, (prev) =>
        prev?.map((o) => (o.id === outfitId ? updated : o)),
      );
      toast.add({ type: "success", description: "Outfit updated." });
    },
  });

  const [replacement, setReplacement] = useState<SelectedImage | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replacementRef = useRef<SelectedImage | null>(null);

  useEffect(() => {
    replacementRef.current = replacement;
  }, [replacement]);

  useEffect(() => {
    return () => {
      if (replacementRef.current) {
        URL.revokeObjectURL(replacementRef.current.url);
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

  const abandonReplacement = () => {
    const rep = replacementRef.current;
    if (!rep) return;
    rep.upload
      .then(({ secureUrl }) => $deleteOrphanImage({ data: { imageUrl: secureUrl } }))
      .catch(() => {});
  };

  const clearReplacement = () => {
    setReplacement((prev) => {
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
    clearReplacement();
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      abandonReplacement();
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
    abandonReplacement();
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
      setReplacement((prev) => {
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
    setReplacement((prev) => {
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
    defaultValues: { name: outfit?.name ?? "" },
    validators: { onChange: outfitNameSchema },
    onSubmit: async ({ value }) => {
      const rep = replacementRef.current;
      if (!rep && !outfit?.image) {
        setImageError("Add a photo of your outfit first.");
        return;
      }
      setSaving(true);
      try {
        const imageUrl = rep ? (await rep.upload).secureUrl : undefined;
        await editMutation.mutateAsync({ name: value.name, imageUrl });
        if (rep) {
          rep.status = "saved";
          replacementRef.current = null;
        }
        resetState();
        onOpenChange(false);
      } catch {
        // Update failures are toasted by the mutation.
      } finally {
        setSaving(false);
      }
    },
  });

  const previewUrl = replacement?.url ?? outfit?.image;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="no-scrollbar h-[80svh] max-h-[90vh] overflow-y-auto rounded-none lg:max-w-2xl">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <DialogHeader>
            <DialogTitle className="astloch-bold mx-auto text-3xl">Edit Outfit</DialogTitle>
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
                id="edit-outfit-photo"
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
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={outfit?.name}
                    className="absolute inset-0 h-full max-h-full w-full rounded-none object-contain lg:hidden"
                  />
                ) : null}
                {replacement?.status === "processing" ? (
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
                    previewUrl && "hidden lg:flex",
                  )}
                >
                  <UploadIcon size={18} strokeWidth={3} />
                  <span className="agdasima-regular text-xs tracking-widest uppercase">
                    {previewUrl ? "Click to replace photo" : "Drop Photos or click to upload"}
                  </span>
                </div>
              </button>
              {imageError ? <p className="text-[10px] text-red-500">{imageError}</p> : null}

              <form.Field
                name="name"
                children={(field) => (
                  <div className="grid gap-2">
                    <InputStyled
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      id="edit-name"
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
                )}
              />
              <Button
                type="submit"
                disabled={saving}
                className="agdasima-bold h-9 rounded-none text-xs uppercase disabled:opacity-50"
              >
                Save Changes
              </Button>
            </div>
            <div className="relative hidden min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-none border bg-[#e9e6e1] p-4 text-black lg:flex">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={outfit?.name}
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
              {replacement?.status === "processing" ? (
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
            <DialogClose className="uppercase underline-offset-2 hover:underline">
              Cancel
            </DialogClose>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteOutfitDialog({
  open,
  onOpenChange,
  outfitId,
  outfitName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outfitId: string;
  outfitName?: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => $deleteOutfit({ data: { outfitId } }),
    onSuccess: async () => {
      queryClient.setQueryData<Outfit[]>(outfitsQueryOptions().queryKey, (prev) =>
        prev?.filter((o) => o.id !== outfitId),
      );
      queryClient.removeQueries({ queryKey: ["outfits", outfitId] });
      toast.add({ type: "success", description: "Outfit deleted." });
      await navigate({ to: "/" });
    },
    onError: () => {
      toast.add({ type: "error", description: "Could not delete the outfit. Try again." });
    },
  });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMutation.mutateAsync();
      onOpenChange(false);
    } catch {
      // Delete failures are toasted by the mutation.
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none">
        <DialogHeader>
          <DialogTitle>Delete outfit?</DialogTitle>
          <DialogDescription>
            {outfitName ? `"${outfitName}"` : "This outfit"} and its photo will be permanently
            removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="rounded-none" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
            className="agdasima-bold rounded-none text-xs uppercase"
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OutfitInfoPanel({ outfit, className }: { outfit: Outfit; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <div className="bg-card py-4 pr-8 pl-5 shadow-md ring-1 ring-foreground/10">
          <p className="agdasima-bold text-2xl tracking-[0.06em] uppercase">{outfit.name}</p>
          <div className="mt-3 h-px w-8 bg-foreground/20" />
          <p className="agdasima-regular mt-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Added {addedAtFormatter.format(new Date(outfit.createdAt))}
          </p>
        </div>
        <div className="mt-10 hidden h-px w-14 bg-border md:block" />
      </div>
    </div>
  );
}

function OutfitEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="agdasima-bold text-2xl uppercase">No image found</p>
      <p className="agdasima-regular text-xs tracking-widest text-muted-foreground uppercase">
        This outfit doesn&apos;t have a photo.
      </p>
      <Link
        to="/"
        className="agdasima-regular text-xs tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        Back to outfits
      </Link>
    </div>
  );
}

function DetailSkeleton() {
  return <div className="h-[60svh] w-full max-w-2xl animate-pulse bg-muted" />;
}
