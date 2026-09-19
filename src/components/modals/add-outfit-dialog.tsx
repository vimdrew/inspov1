import { UploadIcon } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";

import { Button } from "../ui/button";
import { InputStyled } from "../ui/styled-input";

export const AddOutfitDialog = () => {
  return (
    <>
      <Dialog>
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
        <DialogContent className={"rounded-xs lg:max-w-2xl"}>
          <DialogHeader>
            <DialogTitle className={"astloch-bold mx-auto text-3xl"}>Add Outfit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="flex h-30 w-full flex-col items-center justify-center gap-4 border border-dashed border-black bg-[#e9e6e1]">
                <UploadIcon size={18} strokeWidth={3} />
                <span className="agdasima-regular text-xs tracking-widest uppercase">
                  Drop Photos or click to upload
                </span>
              </div>
              <InputStyled className="bg-[#e9e6e1]" name="Outfit Name" />
              <Button className={"agdasima-bold h-9 rounded-xs text-xs uppercase"}>
                Save Outfit
              </Button>
            </div>
            <div className="hidden flex-col items-center justify-center gap-4 rounded-xs bg-blue-500 p-6 text-white lg:flex">
              <span className="agdasima-regular text-xl tracking-widest uppercase">Preview</span>
              <span className="agdasima-regular text-sm uppercase opacity-80">
                Your outfit will show up here
              </span>
            </div>
          </div>
          <span className="agdasima-regular mx-auto text-sm font-light tracking-wider uppercase opacity-50">
            Changed your mind?{" "}
            <DialogClose className={"uppercase underline-offset-2 hover:underline"}>
              Cancel
            </DialogClose>
          </span>
        </DialogContent>
      </Dialog>
    </>
  );
};
