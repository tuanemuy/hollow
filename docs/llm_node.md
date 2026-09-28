# Text, gated documents, full-page PDFs and static images on Node

LLM generation requires the normal OpenRouter configuration and a linked account. Initial connection and model selection do not start generation. Real OpenRouter generation, output quality and billing have not been verified; local contract tests substitute the provider explicitly.

## Available operations

| Input and operation | Behavior |
| --- | --- |
| Text upload, AI selected and a valid connection at acceptance | LLM conversion |
| Text upload without AI, without a connection or without generation configuration | Existing mechanical conversion |
| DOCX/XLSX/PPTX/PDF upload, AI selected and a valid connection at acceptance | LLM conversion only after the complete document passes the preparation gates below |
| DOCX/XLSX/PPTX/PDF upload without AI, connection or generation configuration | Existing mechanical conversion |
| Ordinary HTML/Markdown upload | Always mechanical conversion |
| Static JPEG/PNG/WebP/GIF upload with AI, valid connection and generation configuration | One image dispatch after full-container and pixel validation |
| Image upload without connection/configuration | Original and metadata retained; requires linkage |
| Image upload with AI disabled | Explicit failure; use AI on re-import or regenerate from the retained original |
| Explicit regeneration of a note with a text/HTML/Markdown or supported document original | LLM replacement of the body after confirmation; documents must pass the same preparation gates |
| Manual note without an original | No regeneration action |
| Explicit regeneration from a supported static-image original | Uses the image model and the same static-image gate; body-only undo remains available |
| PDF image/mixed pages or unproven text reading order | Full-page image preparation only after the complete PDF passes the visual-page policy |
| Animated/multiple images and audio | Not provided; originals remain available |

After an LLM request is accepted, provider failure or configuration loss never silently changes it into mechanical conversion. Owners of personal notes and current workspace owners/editors may request regeneration; viewers may not. Editing and other concurrent changes are checked again before committing the generated body.

Regeneration preserves the title, tags, sharing identity and display style. Failure or cancellation preserves the old body. The undo action creates a new body revision from the retained preceding revision, and refuses intervening edits or active conversion. Undo does not refund usage. The model and optional additional instruction are explicit; changing a connection requires a new confirmation with the former settings, not silent adoption of current defaults.

## Document preparation gates

Office preparation inventories the package, relationships and text-bearing parts before accepting all supported text and structure in source order. DOCX supports the admitted paragraph/list/table structures and related header, footer, note and comment text. PPTX includes slide/group/table text and notes. XLSX includes admitted sheet/cell text, cached formula results and hidden content; it does not calculate or repair formulas. Missing cached results, unknown text-bearing parts, ambiguous or unsupported structures, broken relationships, encryption and corruption fail explicitly rather than omitting text.

This is not complete Office rendering. Complex numbering/fields, nested or vertically merged tables, slide-master text and unsupported drawing structures may be refused. Supported non-text media is not interpreted: a fixed notice identifies its unit and the original's coverage is partial even though the supported text coverage is complete. This successful partial-media result is distinct from failed or uncertain generation. It is not an OCR or image-understanding result.

Strict text-PDF preparation inspects every page's text, geometry and drawing operations. Every page must be proven text-covered or blank, and at least one page must contain text. The reading-order policy admits horizontal left-to-right, non-overlapping lines in one left-aligned column, including geometrically adjacent text fragments. Columns, rotation, unclear spacing/order and unsupported visual operations are outside this policy. Centered headings or ordinary indentation can also fail this deliberately narrow policy. Only validated page backgrounds and clipping are allowed; text extraction alone does not prove complete page coverage. Existing recipe 2 jobs retain this policy, including whole-document refusal on parser warnings.

Failures retain the original and any prior body. The interface gives a finite reason and offers explicit mechanical re-import only where mechanical conversion exists. It never silently converts an accepted LLM request mechanically. Technical gates and local contract results do not establish remote-provider output quality.

Office and strict text-PDF preparation use recipe 2, with ordered unit coverage and fixed notices included in their manifest and segment identity. They use the unchanged text prompt/wire version 1; recipe and prompt versions are separate. Existing text/HTML/Markdown recipe 1 hashes and saved responses remain compatible. Legacy nullable recipe storage is read as version 1 without rewriting immutable saved NULL values. New document jobs cannot use NULL or recipe 1. Recovery re-prepares the same recipe and requires exact identity before adopting stored responses, without another external dispatch.

## PDF classification and full-page preparation

An AI PDF upload immediately creates its note and processing job and reserves one logical count. Classification runs after acceptance, including after navigation away. Its pending conversion fixes both purpose-specific model candidates, settings version and connection epoch without guessing a model or dispatching a request. One transactional seal chooses unchanged strict recipe 2/text prompt 1, or full-page recipe 4/image prompt 3. Only valid visual content or unproven text order can select the page path, and only after every page passes its policy. Corruption, encryption, no-text refusal, resource excess and uncertain termination are not image fallbacks. AI-off and unlinked imports keep their previous mechanical path.

PDF regeneration first requires an explicit classification preview. This does not lock the body or reserve quota; editing remains available. The ready result supplies the purpose and its saved default before model selection and body-replacement confirmation. Confirmation consumes the actor-bound receipt and reserves/locks the conversion in one transaction. The receipt is bound to the original, note version, ownership generation and connection epoch and lasts five minutes. Current permission and identity are checked again; polling only reads state. Reload can rediscover only the current actor's live preview. An uncertain acknowledgement is resolved by reading the same command, not by posting a new one. Preview cancellation or expiry never proves that an unknown owner has stopped.

The full-page policy renders the display appearance, CropBox and intrinsic rotation at 144 dpi on white. It admits at most 32 pages, a 1,728-pixel long edge, 4 MiB PNG per page and 64 MiB total prepared PNG bytes. Preparation allows ten seconds per page and 120 seconds per document. Supported square annotations require their explicit appearance; unsupported annotations, forms, optional-content groups, actions and external resources are refused. Local fonts/CMaps/WASM come only from fixed installed assets. Parser warnings reject the entire preparation, including warnings observed during cleanup.

All pages are rendered before dispatch. Only metadata and a source-bound ordered manifest are retained. Each page is then rendered again and its dimensions, bytes and hash must match before that page is sent: a successful N-page conversion renders 2N pages. One request contains one page and the complete JSON must fit 6 MiB. No page or response is silently truncated or omitted. These limits bound admission and retained/transferred resources, not native encoder peak memory or recognition quality. Image tokens are not calculated in advance; fitting these limits does not guarantee model context fit.

A dedicated child handles one preparation or redraw request. Stdout carries at most 64 KiB finite metadata; fd 3 carries at most 4 MiB PNG for redraw and stays empty for inspection. Final metadata follows cleanup. The parent discards binary output on a failure result and waits for process and all pipe closure. Stored conversion/dispatch identities contain hashes and metadata, not PNG/base64. Saved-response recovery requires the complete expected page set and fresh matching preparation; it only finalizes existing responses and never sends a missing page automatically. Earlier sent pages retain the single consumed count if a later page fails, while the prior body remains unchanged.

## Static-image preparation and image profiles

Only complete static JPEG, PNG, WebP and GIF containers are admitted. Animation, multiple frames/MPF, invalid CRC or structure, truncation and unsupported containers are rejected; the first frame is never silently substituted. Every source pixel is decoded. EXIF orientation is applied, color is converted to sRGB, transparency is flattened onto white, metadata is removed, and the result is encoded as RGB PNG and decoded again. There is no resize or crop. This preserves input coverage, not recognition accuracy; users must check the retained original.

Both dimensions are at most 4,096 pixels and their product at most 16,000,000. The original limit is 50 MiB, normalized PNG at most 8 MiB, and the complete chat request at most 12 MiB. The encoder may allocate native output before its stream emits it: these are outer retained/transferred-byte limits, not an 8 MiB native peak or process-RSS guarantee. Small codec tests and pure exact/over-limit checks do not establish maximum-load performance.

A fixed native child receives source bytes on stdin, writes PNG on stdout and finite metadata (16 KiB) on fd 3. Stderr is discarded and limited to 4 KiB. It inherits only a small environment allowlist. Blocking Node networking APIs is not an OS sandbox guarantee. The parent verifies bytes, hash, dimensions and metadata and waits for actual child exit/close and every pipe; an abort or deadline alone cannot release ownership. Failure to prove termination remains unknown and blocks early resource release.

Image preparation uses recipe 3 and prompt 2. A fixed manifest binds original identity, normalization policy, source/result dimensions, orientation, frame count and the actual PNG hash. One raster dispatch uses ordinal zero. PNG/base64 is never stored in the job database. The image generator sends text followed by one local PNG data URI; it accepts no arbitrary remote image URL or file. Existing recipe 1/2 and prompt 1 remain unchanged. Saved-response recovery re-prepares and requires matching identity; a mismatch preserves the old body, sent usage and non-redispatch rule.

Image and text profiles are distinct even for the same model ID. Image admission requires current text/image input, text output and `max_tokens` support. Live custom profiles expire after fifteen minutes. The versioned image default's local validation lasts thirty days from its recorded check; this is not a provider availability guarantee. A complete catalog's explicit denial, expiry or missing entry prevents static resurrection. Image budget is **resource-only**: image token usage is unknown and context fit is not guaranteed. Text plus output resources are checked in advance; provider context rejection is an explicit failure under the existing intent/quota rules, never fallback or automatic resend.

## Monthly usage

`HOLLOW_LLM_MONTHLY_LIMIT` defaults to `30` per account. It accepts a non-negative safe integer; `0` prevents new reservations. Invalid configuration disables generation and records only a safe configuration code. It does not disable ordinary password authentication or mechanical imports. Configuration is read at boot, and changing the limit does not remove previous reservations or consumed usage.

A logical file conversion or regeneration reserves one count in its acceptance-time UTC calendar month. Internal segments do not add counts. The first durable dispatch intent consumes that count. Post-intent failure, cancellation and delivery uncertainty retain it; only proof that **every** segment was never sent permits a refund after ownership is closed. Redispatch/recovery does not add a second count, and an explicit new retry is a new logical request. A job crossing a month boundary stays in its original bucket. Reconnection does not reset usage.

The page displays consumed, reserved and remaining counts, the usage confirmation time, and the next UTC month boundary in the user's timezone. The confirmation time is the read snapshot, not the last quota mutation. It warns only when consumed usage is strictly above 80%; reservations do not trigger the warning. Generation usage is separate from storage capacity. An over-limit conversion is recorded as a failed job. Mechanically supported formats can be imported mechanically by explicit choice; LLM-required formats must wait for an available month rather than bypassing the limit.

## Finite execution and storage

The runtime shares two active execution slots globally and one per account across conversions and PDF previews. Each account has a combined queue limit of 100; previews additionally admit at most one live receipt per note and actor. A job has a fixed 30-minute deadline; ordinary source preparation has 30 seconds, full-page PDF preparation 120 seconds, and each external dispatch 90 seconds. Abort is a request to stop, not evidence of termination. Shutdown stops admission and waits for actual owned work before closing storage and the database. A watchdog or lease never releases unknown ownership.

The existing 50 MiB original acceptance limit is distinct from preparation and body limits. Safe source is split into at most 16 segments of 64 KiB UTF-8 each. Tables and code blocks must fit without being cut; exceeding a technical limit is an explicit failure, not omitted content. Responses are at most 2 MiB, generated segment content at most 64 KiB, and the final sanitized body at most 800 KiB. Output is limited to 8,192 tokens and checked against the model profile. Missing, truncated or malformed output fails without replacing the old body.

Document preparation runs in an owned Worker with a 256 MiB old-generation heap limit, not an RSS guarantee. Its archive limits are 4,096 entries, 128 MiB total expansion, 16 MiB per XML part and depth 128. Documents are limited to 200 PDF pages or slides, 100 sheets and 200,000 cells. Large indivisible tables must still fit one 64 KiB segment. Local PDF fonts/CMaps/WASM are resolved from the installed, fixed dependency; remote assets and document-initiated network requests are not allowed. Preparation success and slot release wait for Worker exit and both output pipes to close.

Normal HTTP is fixed HTTPS chat completion with no retry, redirect or provider fallback, and requests `data_collection: deny` and required parameter support. This is not a guarantee of zero provider retention or cancelled charges. Request, response and socket close are awaited on every path. Credentials, prompts, raw provider errors, response bodies and headers are not logged.

Only validated, existing note-owned media placeholders may be restored from the original. New generated URLs, active markup and CSS are removed; generated references are never fetched. Prepared source identity, ordered coverage, expected marker counts and current asset ownership are rechecked before commit. Response payloads and instructions are not operational diagnostics.

Private `.llm-runtime` metadata belongs to the same object-storage directory and records runtime ownership. Keep it with stopped backups. Restart may recover only recorded predecessors whose OS termination is proven; live, inaccessible or unconfirmed PIDs block recovery. Never delete the record, reset all owners, kill an unrelated process or treat elapsed time as proof. An intent with uncertain acknowledgement is looked up durably and is not automatically sent again. All durable responses may be finalized without decrypting a credential only if the same current epoch, note/source/version, permission, cancellation and deadline checks still pass.

Public job history lasts 90 days. Internal resource debt may outlive visible history until ownership is resolved. Note purge waits for active/unknown owners and budgets, then archives safe job history and removes eligible payloads; it never reduces cumulative consumed quota. Accounts and credentials are not deleted as a side effect of fixture cleanup.

## Approved live-provider probe

No live probe is authorized by these instructions alone. Obtain explicit permission for external generation and a spending limit, select an operator-owned test account, preserve a stopped backup, and use the normal runtime without constructor substitutions. Do not discover or reuse unrelated credentials.

1. Verify the connection-only prerequisites in [OpenRouter configuration](openrouter_node.md), including callback correlation and the exchange authentication discrepancy. Keep token/code/cookie/PKCE values out of logs and screenshots.
2. Confirm the selected model's current text capability, profile and supported output-budget parameter. Custom models require a fresh complete catalog profile; defaults use the documented adopted profile only while not contradicted by a complete catalog. Do not weaken capability or response validation to make the probe pass.
3. Submit one small, non-sensitive text file through the normal UI with explicit AI selection. Observe one logical reservation/consumption, terminal state, complete body and actual owned-resource closure. Record safe counts, source/bundle identity and whether real provider access occurred, not raw prompts or responses in diagnostics.
4. On uncertainty, stop additional requests. Inspect only approved safe metadata, preserve the state and prove owned termination. Do not replay a code, automatically resubmit a dispatch, clear quota or switch credentials to obtain success.
5. Test any additional regeneration, cancellation or retry only within the separately approved request and spending budget. Stop normally, verify processes/ports/handles, and preserve a final backup before asking to remove material fixtures through normal product paths.

Local tests cover contracts and failure handling, not real provider quality, cost or remote cancellation. Any approved document probe must use one small original inside the admitted structure/layout subset and separately confirm complete source coverage. An approved image or full-page PDF probe needs a separately authorized small input and request/spend budget; verify image-purpose capabilities and compare every page with the complete original. Audio conversion remains unavailable; mock transcripts and local sample-coverage tests do not establish real transcription or privacy enforcement.
