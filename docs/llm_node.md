# Text and gated document generation on Node

LLM generation requires the normal OpenRouter configuration and a linked account. Initial connection and model selection do not start generation. Real OpenRouter generation, output quality and billing have not been verified; local contract tests substitute the provider explicitly.

## Available operations

| Input and operation | Behavior |
| --- | --- |
| Text upload, AI selected and a valid connection at acceptance | LLM conversion |
| Text upload without AI, without a connection or without generation configuration | Existing mechanical conversion |
| DOCX/XLSX/PPTX/PDF upload, AI selected and a valid connection at acceptance | LLM conversion only after the complete document passes the preparation gates below |
| DOCX/XLSX/PPTX/PDF upload without AI, connection or generation configuration | Existing mechanical conversion |
| Ordinary HTML/Markdown upload | Always mechanical conversion |
| Explicit regeneration of a note with a text/HTML/Markdown or supported document original | LLM replacement of the body after confirmation; documents must pass the same preparation gates |
| Manual note without an original | No regeneration action |
| Images, audio, image/mixed PDF pages or unproven PDF reading order | Not provided by this document path; originals remain available |

After an LLM request is accepted, provider failure or configuration loss never silently changes it into mechanical conversion. Owners of personal notes and current workspace owners/editors may request regeneration; viewers may not. Editing and other concurrent changes are checked again before committing the generated body.

Regeneration preserves the title, tags, sharing identity and display style. Failure or cancellation preserves the old body. The undo action creates a new body revision from the retained preceding revision, and refuses intervening edits or active conversion. Undo does not refund usage. The model and optional additional instruction are explicit; changing a connection requires a new confirmation with the former settings, not silent adoption of current defaults.

## Document preparation gates

Office preparation inventories the package, relationships and text-bearing parts before accepting all supported text and structure in source order. DOCX supports the admitted paragraph/list/table structures and related header, footer, note and comment text. PPTX includes slide/group/table text and notes. XLSX includes admitted sheet/cell text, cached formula results and hidden content; it does not calculate or repair formulas. Missing cached results, unknown text-bearing parts, ambiguous or unsupported structures, broken relationships, encryption and corruption fail explicitly rather than omitting text.

This is not complete Office rendering. Complex numbering/fields, nested or vertically merged tables, slide-master text and unsupported drawing structures may be refused. Supported non-text media is not interpreted: a fixed notice identifies its unit and the original's coverage is partial even though the supported text coverage is complete. This successful partial-media result is distinct from failed or uncertain generation. It is not an OCR or image-understanding result.

PDF preparation inspects every page's text, geometry and drawing operations. Every page must be proven text-covered or blank, and at least one page must contain text. The initial reading-order policy admits horizontal left-to-right, non-overlapping lines in one left-aligned column, including geometrically adjacent text fragments. Columns, rotation, unclear spacing/order and unsupported visual operations are refused. Centered headings or ordinary indentation can also fail this deliberately narrow policy. Only validated page backgrounds and clipping are allowed; text extraction alone does not prove complete page coverage. Mixed/image pages and complex diagrams need the later visual-page path, not a silent subset or automatic OCR fallback.

Failures retain the original and any prior body. The interface gives a finite reason and offers explicit mechanical re-import only where mechanical conversion exists. It never silently converts an accepted LLM request mechanically. Technical gates and local contract results do not establish remote-provider output quality.

Document preparation uses recipe 2, with ordered unit coverage and fixed notices included in its manifest and segment identity. It uses the unchanged text prompt/wire version 1; recipe and prompt versions are separate. Existing text/HTML/Markdown recipe 1 hashes and saved responses remain compatible. Legacy nullable recipe storage is read as version 1 without rewriting immutable saved NULL values. New document jobs cannot use NULL or recipe 1. Recovery re-prepares the same recipe and requires exact identity before adopting stored responses, without another external dispatch.

## Monthly usage

`HOLLOW_LLM_MONTHLY_LIMIT` defaults to `30` per account. It accepts a non-negative safe integer; `0` prevents new reservations. Invalid configuration disables generation and records only a safe configuration code. It does not disable ordinary password authentication or mechanical imports. Configuration is read at boot, and changing the limit does not remove previous reservations or consumed usage.

A logical file conversion or regeneration reserves one count in its acceptance-time UTC calendar month. Internal segments do not add counts. The first durable dispatch intent consumes that count. Post-intent failure, cancellation and delivery uncertainty retain it; only proof that **every** segment was never sent permits a refund after ownership is closed. Redispatch/recovery does not add a second count, and an explicit new retry is a new logical request. A job crossing a month boundary stays in its original bucket. Reconnection does not reset usage.

The page displays consumed, reserved and remaining counts, the usage confirmation time, and the next UTC month boundary in the user's timezone. The confirmation time is the read snapshot, not the last quota mutation. It warns only when consumed usage is strictly above 80%; reservations do not trigger the warning. Generation usage is separate from storage capacity. An over-limit conversion is recorded as a failed job. Mechanically supported formats can be imported mechanically by explicit choice; LLM-required formats must wait for an available month rather than bypassing the limit.

## Finite execution and storage

The runtime admits two active jobs globally and one per account, with a queue limit of 100. A job has a fixed 30-minute deadline; source preparation has 30 seconds, each external dispatch 90 seconds. Abort is a request to stop, not evidence of termination. Shutdown stops admission and waits for actual owned work before closing storage and the database. A watchdog or lease never releases unknown ownership.

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

Local tests cover contracts and failure handling, not real provider quality, cost or remote cancellation. Any approved document probe must use one small original inside the admitted structure/layout subset and separately confirm complete source coverage. Static images and visual-page/audio conversion remain later implementation work; accepting a text-only subset does not complete those media requirements.
