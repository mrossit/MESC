import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

interface ImageZoomModalProps {
  imageUrl?: string;
  fallbackText: string;
  alt?: string;
  children: React.ReactNode;
  stopPropagation?: boolean;
}

export function ImageZoomModal({ imageUrl, fallbackText, alt, children, stopPropagation = false }: ImageZoomModalProps) {
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    setOpen(true);
  };

  return (
    <>
      <div 
        onClick={handleClick} 
        className="cursor-pointer"
        data-testid="image-zoom-trigger"
      >
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-4">
          <div className="flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={alt || "Foto ampliada"}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                data-testid="zoomed-image"
              />
            ) : (
              <Avatar className="h-64 w-64">
                <AvatarImage src={imageUrl} />
                <AvatarFallback className="text-6xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {fallbackText}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
