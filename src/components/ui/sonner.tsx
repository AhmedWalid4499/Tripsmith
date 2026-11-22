"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-card !text-card-foreground !shadow-md !font-sans",
          description: "!text-muted-foreground",
          error: "!border-destructive/40",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
