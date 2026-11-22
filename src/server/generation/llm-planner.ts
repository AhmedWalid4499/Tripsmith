import "server-only";
import { generateStructured } from "@/server/llm/client";
import { dayPrompt, outlinePrompt, PLANNER_SYSTEM } from "./prompts";
import { DayPlanSchema, OutlineSchema } from "./schemas";
import type { Planner } from "./types";

export const llmPlanner: Planner = {
  name: "llm",
  outline(brief, ctx) {
    return generateStructured({
      purpose: "outline",
      schema: OutlineSchema,
      system: PLANNER_SYSTEM,
      prompt: outlinePrompt(brief),
      effort: "high",
      maxTokens: 24_000,
      ctx,
    });
  },
  day(day, ctx) {
    return generateStructured({
      purpose: "day",
      schema: DayPlanSchema,
      system: PLANNER_SYSTEM,
      prompt: dayPrompt(day),
      effort: "medium",
      maxTokens: 16_000,
      ctx,
    });
  },
};
