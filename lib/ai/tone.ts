// lib/ai/tone.ts
export type ToneMode =
  | "default"
  | "teacher"
  | "friendly"
  | "professional"
  | "concise";

export const TONE_PROMPTS: Record<ToneMode, string> = {
  default: "回答清晰自然。",
  teacher: "像耐心老师一样讲解，分步骤说明，先讲概念，再讲例子。",
  friendly: "语气自然亲切，不生硬。",
  professional: "语气专业、直接、准确。",
  concise: "回答简洁，少废话，先给结论。",
};

export function getTonePrompt(tone: ToneMode = "default") {
  return TONE_PROMPTS[tone];
}
