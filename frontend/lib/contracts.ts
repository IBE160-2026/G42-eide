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

/*
 * The success reply of one Generation Pass (Story 1.13, D9), as the backend emits it in
 * JSON: `GenerationResponse` and `ValidatedResults` in `backend/app/contracts/`. Page lists
 * are `ResultPages` (strictly increasing integers above 0; may be empty), texts are
 * `ResultText`. `isGenerationResponse` in `lib/generation.ts` checks the shape at runtime.
 */

export interface ValidatedSummary {
  text: string;
  pages: number[];
}

export interface ValidatedFlashcard {
  front: string;
  back: string;
  pages: number[];
}

export interface ValidatedQuizItem {
  question: string;
  answer: string;
  pages: number[];
}

export interface ValidatedKeyConcept {
  term: string;
  explanation: string;
  pages: number[];
}

export interface ValidatedResults {
  summary: ValidatedSummary;
  flashcards: ValidatedFlashcard[];
  quiz: ValidatedQuizItem[];
  key_concepts: ValidatedKeyConcept[];
}

/** Body of a successful `POST /api/demo` (and later `POST /api/generate`), AD-11. */
export interface GenerationResponse {
  mode: AiMode;
  results: ValidatedResults;
  skipped_pages: number[];
}

/*
 * The AD-11 error contract (Story 1.15, D18): `ErrorCode` and `LimitKind` mirror the
 * `Literal` types in `backend/app/contracts/errors.py`, in the same order; the TS union
 * changes together with the backend enum. `ErrorEnvelope` is the body of every non-2xx
 * reply; `error_code` is a plain string at runtime so that an unknown code still passes
 * the shape check and falls back to the generic texts.
 */

export type ErrorCode =
  | "unsupported_file_type"
  | "bad_text_encoding"
  | "unreadable_file"
  | "no_extractable_text"
  | "invalid_request"
  | "demo_mode_no_uploads"
  | "demo_not_enabled"
  | "not_found"
  | "method_not_allowed"
  | "generation_in_progress"
  | "file_too_large"
  | "insufficient_content"
  | "ai_rate_limited"
  | "internal_error"
  | "ai_unavailable"
  | "ai_output_invalid"
  | "ai_credits_exhausted"
  | "session_call_limit_reached";

export type LimitKind = "bytes" | "pages" | "characters" | "tokens";

/** Body of every non-2xx reply: `{error_code, message, limit?, reference_id?}` (AD-11). */
export interface ErrorEnvelope {
  error_code: string;
  message: string;
  limit?: LimitKind;
  reference_id?: string;
}
