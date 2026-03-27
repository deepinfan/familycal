import type { LlmParsedResult, LlmParseContext } from "../llm/adapter";

export type { LlmParsedResult, LlmParseContext };

export type Role = {
  id: string;
  name: string;
  nameEn?: string | null;
};
