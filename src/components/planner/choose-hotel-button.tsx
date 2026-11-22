"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { selectHotelAction } from "@/server/actions/planner";
import { Button } from "@/components/ui/button";

export function ChooseHotelButton({ hotelId, name }: { hotelId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      disabled={pending}
      aria-label={`Choose ${name}`}
      onClick={() =>
        start(async () => {
          const r = await selectHotelAction(hotelId);
          if (r.error) toast.error(r.error);
          else toast.success(`${name} chosen. Your budget is updated.`);
        })
      }
    >
      {pending ? "Choosing…" : "Choose this hotel"}
    </Button>
  );
}
