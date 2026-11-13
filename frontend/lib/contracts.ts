/*
 * Frontend mirrors of the backend contracts (AR-13). Pydantic in
 * `backend/app/contracts/` is the source of truth; names stay identical
 * `snake_case`, literal unions match the backend `Literal` types.
 */

export type AiMode = "demo" | "real";

export type DetailLevel = "brief" | "standard" | "detailed";

export type OutputLanguage = "nb" | "en";

export interface StatusLimits {
  max_upload_bytes: number;
  max_pdf_pages: number;
  max_text_chars: number;
}

export interface DetailLevelOption {
  values: DetailLevel[];
  default: DetailLevel;
}

export interface OutputLanguageOption {
  values: OutputLanguage[];
  default: OutputLanguage;
}

export interface StatusOptions {
  detail_level: DetailLevelOption;
  output_language: OutputLanguageOption;
}

/** Body of `GET /api/status` (AR-24). */
export interface StatusResponse {
  mode: AiMode;
  limits: StatusLimits;
  options: StatusOptions;
  accepted_types: string[];
}
