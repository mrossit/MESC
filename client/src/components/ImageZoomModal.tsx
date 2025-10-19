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
        <DialogContent className="max-w-md p-6 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-center">
            {imageUrl ? (
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
                <img
                  src={imageUrl}
                  alt={alt || "Foto ampliada"}
                  className="w-full h-full object-cover rounded-full shadow-2xl border-4 border-gray-200 dark:border-gray-700"
                  data-testid="zoomed-image"
                />
              </div>
            ) : (
              <Avatar className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 shadow-2xl border-4 border-gray-200 dark:border-gray-700">
                <AvatarImage src={imageUrl} />
                <AvatarFallback className="text-6xl sm:text-7xl md:text-8xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
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
