# OpenRouter connection on Node

This release provides account-level OpenRouter authorization, connection management and purpose-specific model settings. Configured Node runtimes offer text conversion, gated DOCX/XLSX/PPTX conversion, classified strict-text or full-page PDF conversion, static JPEG/PNG/WebP/GIF conversion and explicit regeneration from supported originals; see [LLM operations](llm_node.md) for restricted coverage and image resource-only admission. PDF previews disclose text/image purpose before regeneration model selection and confirmation; upload classification fixes the accepted candidates and never replaces an existing recipe. Connecting alone does not resume uploads or create conversion jobs. Ordinary HTML/Markdown imports remain mechanical. WAV/MP3/M4A/Ogg/FLAC generation uses dedicated transcription followed by body structuring and additionally requires the audio tools configuration described in LLM operations. Google authentication and Google Drive authorization are separate.

## Configuration

Set `HOLLOW_OPENROUTER_CONFIG` to an absolute path outside the repository, database, object storage, mailbox and static files. The strict UTF-8 JSON file has one field:

```json
{
  "keyFile": "/absolute/private/path/openrouter-encryption.key"
}
```

The file belongs to the runtime user, has mode `0600`, is at most 16 KiB, and has a private `0700` parent directory. Neither may be a symbolic link. `keyFile` is an absolute path to exactly 32 random bytes with the same ownership and permission requirements. Create this dedicated key once using exclusive creation. Do not reuse invitation, sharing, Google PKCE, or Drive keys. Never print, hash into evidence, commit, or overwrite key bytes.

Keep the encryption key across restarts and back it up securely with the protected database. A database backup alone cannot decrypt saved credentials. Configuration is read at boot; hot reload and key rotation are not provided. Missing or invalid configuration disables new authorization, key checks and model changes while preserving saved state. Local unlink and ordinary password authentication remain available. Expired attempts can be scrubbed without decrypting them.

`APP_URL` determines the fixed `/auth/openrouter/callback` origin. Keep it distinct from the listener bind address. The normal constructor uses the real provider and fixed HTTPS endpoints. There is no environment variable or HTTP route that selects a fake provider.

## Connection lifecycle

Authorization uses S256 and a ten-minute attempt bound to the initiating account, session, authentication version, browser epoch and expected connection generation. Starting authorization does not issue a Hollow session. At most five starts per browser in ten minutes and three active attempts are admitted.

The authorization code is exchanged once outside the database transaction. An uncertain exchange is not automatically replayed: use the explicit new-start action. A durably saved candidate credential may be checked again through the result page; this retries metadata inspection, not code exchange. Candidate promotion rechecks current authentication, browser, connection generation and the original deadline atomically. Restart does not invent proof that an interrupted external exchange failed.

Reconnection requires confirmation. Failed authorization or metadata validation preserves the old connection; successful promotion replaces only the confirmed generation and preserves model settings. Promotion atomically fences that account's old-generation LLM work. New demand admitted since confirmation requires confirmation again; a saved candidate is reused without exchanging its code again or extending its deadline. Old jobs are never attached to the new credential. Unlink removes Hollow's local credential and fences older attempts and conversions. Local cancellation waits for owned work to terminate; it is not provider-wide revocation or a guarantee of cancelled charges and does not remove Google, Drive, or completed notes.

After first linkage, the result may show currently readable waiting notes. Empty results and reconnections do not show this initial list. The list is not an authorization grant for generation; reopening it uses current note and workspace access. Return to upload is explicit, never an automatic resubmission.

## Models and unavailable catalogs

Text/image chat and audio transcription are distinct purposes and endpoints. Audio chat capability does not qualify a model as STT. Saved choices use optimistic concurrency and cannot be silently replaced by a catalog failure.

The versioned contract-test defaults are `google/gemini-3.5-flash-lite` for text/image and `openai/whisper-large-v3` for transcription. These are adopted candidates, not a claim of verified production quality, cost, or current availability. Saving settings never starts conversion. Static-image generation separately checks an image-purpose resource profile; its adopted profile has a thirty-day local validation deadline, without changing the existing text default policy. Audio generation separately requires the dedicated tools configuration and STT-purpose profile in [LLM operations](llm_node.md).

A successful complete catalog is cached for at most fifteen minutes. On failure, the page offers only the adopted default subset and a retry action, labels it unverified, and preserves the previous saved choice. Explicitly selecting a displayed default may be saved; an arbitrary unverified custom ID may not. Defaults missing or expired in this provider instance's last complete catalog are excluded. Partial responses do not update that knowledge; a later complete catalog may restore a candidate. This dynamic knowledge is not persisted across restart. An empty eligible subset remains empty.

## Resource and secret boundaries

Google and OpenRouter use separate keys and execution pools. OpenRouter admits four operations with no queue. Code exchange plus initial metadata inspection share a ten-second deadline. Abort requests cancellation but does not return the slot until the owned operation terminates. Shutdown stops admission and waits for owned operations before closing the database.

Native HTTP uses fixed `openrouter.ai:443` paths, `agent:false`, no retries, no redirects and identity encoding only. Request, response and socket close are all awaited. Code is limited to 4 KiB; key and metadata bodies to 64 KiB. Catalog consumption is bounded to 2 MiB per page, 20 pages, 5,000 models and 8 MiB total under one ten-second deadline. Only a validated complete catalog is accepted. Provider-native errors, headers, credentials and cause chains are not exposed to DTOs or logs.

Explicit metadata 401 and a valid, already elapsed key expiry indicate invalid credentials. Timeouts, 429/5xx and malformed provider metadata indicate unavailable verification, not proof of invalidity. An older result cannot invalidate a newer connection. Periodic pruning runs every sixty seconds in bounded batches; referenced browser contexts remain pinned until attempts are removed.

## Conditional real-provider verification

Real OpenRouter authorization, TLS behavior, credentials, billing and generation have **not** been exercised. External access requires explicit authorization, operator-owned test accounts, an approved callback origin and protected backups. Do not discover existing credentials or supply a management key to bypass an incompatible exchange API.

The [official PKCE guide](https://openrouter.ai/docs/guides/overview/auth/oauth) documents `callback_url`, S256 and a code exchange example without a Bearer header. It does not establish that an arbitrary correlation query inside the callback is preserved. The implementation requires that exact correlation to return; it never assigns a callback to the latest attempt or assumes `state` echo. Exchange authentication differences in provider reference material remain an integration prerequisite to verify. The [model reference](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties) is the catalog contract reference. Public documentation was checked on 2026-09-28; local contract tests do not establish real endpoint behavior.

Before an approved live test, run the normal checks and the OpenRouter unit/Node integration tests. Isolated browser contract tests may inject a provider through trusted server composition, using the same bundle, a separate database, dedicated keys and an explicitly labeled local consent page. Record that substitution; do not call it a successful OpenRouter login.

For an approved live connection-only test:

1. Stop the owned runtime and create an exclusive protected backup. Use a separate test account, not an existing user's credential. Configure the dedicated encryption key and normal `boot()` path without constructor substitutions.
2. Start from the normal settings page. Complete consent once. Verify callback correlation preservation, one code exchange without a management credential, successful metadata inspection and the safe result page. Do not capture callback queries, tokens, codes, PKCE values, cookies or provider-user IDs.
3. Inspect purpose-compatible catalog choices and save through the normal page. Record safe availability/expiry outcomes, not raw provider responses. Catalog incompatibility must remain an unavailable result; do not weaken schema or capability checks to obtain success.
4. Confirm reconnect cancellation preserves the current connection, successful reconnection adopts a new generation, and local unlink does not claim provider revocation. On an uncertain code exchange, stop and use a new explicit attempt rather than replaying the old code.
5. Verify ordinary password and mechanical imports still work when OpenRouter is unconfigured. Close the browser and stop normally, check owned resources, and compare only safe metadata. Ask before deleting material fixtures; retain accounts/keys where the product does not provide deletion.

Record source/bundle, time, normal versus substituted composition, safe branch results, cleanup and remaining limitations. This connection-only procedure must not dispatch generation. Live generation requires the separate approval and finite procedure in [LLM operations](llm_node.md); audio processing additionally requires the dedicated tools configuration described there. [Local audio verification](browser_audio.md) uses owned-loopback STT and chat providers without real generation or billing.
