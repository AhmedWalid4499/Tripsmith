"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/session";
import { DISPLAY_CURRENCIES } from "@/lib/money/currencies";
import { isCountryCode } from "@/lib/countries";

const AccountSchema = z.object({
  name: z.string().trim().max(80, "Keep your name under 80 characters.").optional(),
  displayCurrency: z.enum(DISPLAY_CURRENCIES),
  nationality: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || isCountryCode(v), "Choose a country from the list.")
    .optional(),
  homeCity: z.string().trim().max(80, "Keep the city under 80 characters.").optional(),
});

export type AccountFormState = {
  ok?: boolean;
  errors?: Partial<Record<keyof z.infer<typeof AccountSchema>, string>>;
};

export async function updateAccountAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  // Server Actions are public endpoints: always re-check the session here.
  const user = await getCurrentUser();
  if (!user) return { errors: { name: "Your session expired. Sign in again." } };

  const parsed = AccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: AccountFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<AccountFormState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const { name, displayCurrency, nationality, homeCity } = parsed.data;
  await db.user.update({
    where: { id: user.id },
    data: {
      name: name || null,
      displayCurrency,
      nationality: nationality || null,
      homeCity: homeCity || null,
    },
  });
  revalidatePath("/account");
  return { ok: true };
}
