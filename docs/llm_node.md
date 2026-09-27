# Text generation on Node

LLM generation requires the normal OpenRouter configuration and a linked account. Initial connection and model selection do not start generation. Real OpenRouter generation, output quality and billing have not been verified; local contract tests substitute the provider explicitly.

## Available operations

| Input and operation | Behavior |
| --- | --- |
| Text upload, AI selected and a valid connection at acceptance | LLM conversion |
| Text upload without AI, without a connection or without generation configuration | Existing mechanical conversion |
| Ordinary HTML/Markdown upload | Always mechanical conversion |
| Explicit regeneration of a note with a text/HTML/Markdown original | LLM replacement of the body after confirmation |
| Manual note without an original | No regeneration action |
| Office, PDF, image and audio LLM conversion | Not provided |

After an LLM request is accepted, provider failure or configuration loss never silently changes it into mechanical conversion. Owners of personal notes and current workspace owners/editors may request regeneration; viewers may not. Editing and other concurrent changes are checked again before committing the generated body.

Regeneration preserves the title, tags, sharing identity and display style. Failure or cancellation preserves the old body. The undo action creates a new body revision from the retained preceding revision, and refuses intervening edits or active conversion. Undo does not refund usage. The model and optional additional instruction are explicit; changing a connection requires a new confirmation with the former settings, not silent adoption of current defaults.

## Monthly usage

`HOLLOW_LLM_MONTHLY_LIMIT` defaults to `30` per account. It accepts a non-negative safe integer; `0` prevents new reservations. Invalid configuration disables generation and records only a safe configuration code. It does not disable ordinary password authentication or mechanical imports. Configuration is read at boot, and changing the limit does not remove previous reservations or consumed usage.

A logical file conversion or regeneration reserves one count in its acceptance-time UTC calendar month. Internal segments do not add counts. The first durable dispatch intent consumes that count. Post-intent failure, cancellation and delivery uncertainty retain it; only proof that **every** segment was never sent permits a refund after ownership is closed. Redispatch/recovery does not add a second count, and an explicit new retry is a new logical request. A job crossing a month boundary stays in its original bucket. Reconnection does not reset usage.

The page displays consumed, reserved and remaining counts, the usage confirmation time, and the next UTC month boundary in the user's timezone. The confirmation time is the read snapshot, not the last quota mutation. It warns strictly above 80% and distinguishes generation usage from storage capacity. An over-limit conversion is recorded as a failed job. Text can be imported mechanically by explicit choice; LLM-required formats must wait for an available month rather than bypassing the limit.

## Finite execution and storage

The runtime admits two active jobs globally and one per account, with a queue limit of 100. A job has a fixed 30-minute deadline; source preparation has 30 seconds, each external dispatch 90 seconds. Abort is a request to stop, not evidence of termination. Shutdown stops admission and waits for actual owned work before closing storage and the database. A watchdog or lease never releases unknown ownership.

The existing 50 MiB original acceptance limit is distinct from preparation and body limits. Safe source is split into at most 16 segments of 64 KiB UTF-8 each. Tables and code blocks must fit without being cut; exceeding a technical limit is an explicit failure, not omitted content. Responses are at most 2 MiB, generated segment content at most 64 KiB, and the final sanitized body at most 800 KiB. Output is limited to 8,192 tokens and checked against the model profile. Missing, truncated or malformed output fails without replacing the old body.

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

Local tests cover contracts and failure handling, not real provider quality, cost or remote cancellation. Office/PDF/image and audio/page conversion need their later implementation and independent verification.
