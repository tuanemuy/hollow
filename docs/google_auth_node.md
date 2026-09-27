# Google authentication on Node

Google sign-in is optional. An unconfigured installation keeps password sign-in, ordinary email verification and password reset available when a mail adapter is configured. Login-method management does not configure Google Drive or request Drive permissions.

## Configuration

Set `HOLLOW_GOOGLE_CONFIG` to an absolute path outside the repository, database, object storage, mailbox and static files. The UTF-8 JSON file must belong to the runtime user, have mode `0600`, be at most 16 KiB, and have a private `0700` parent directory. The file and its parent must not be symbolic links. Its only fields are:

```json
{
  "clientId": "<Google web application client ID>",
  "clientSecret": "<Google client secret>",
  "pkceKeyFile": "/absolute/private/path/google-pkce.key"
}
```

`pkceKeyFile` contains exactly 32 random bytes, owned by the runtime user with mode `0600` in a private `0700` directory. Create a dedicated key with exclusive creation; do not reuse invitation, sharing, or Drive keys. Do not print, hash into evidence, commit, or overwrite key bytes. Preserve this key securely across restarts. Configuration is read at boot; hot reload and key rotation are not provided.

Register the callback obtained from `new URL('/auth/google/callback', APP_URL)`. For the local application URL `http://localhost:3000`, this is `http://localhost:3000/auth/google/callback`; the listener's `127.0.0.1` bind address is not a substitute for the application origin. Configure the provider's web application and consent settings before enabling access. The authorization request uses `openid email profile`, online access, S256 PKCE and account selection. There is no refresh-token or Drive authorization flow here.

Missing, invalid, inaccessible, or incorrectly permissioned configuration disables new Google authorization and displays an unavailable explanation. It does not enable a fake provider. Existing login methods are not silently removed, and password authentication remains available. Expired attempts can be scrubbed without decrypting the protected PKCE verifier.

Production uses fixed Google authorization, token and certificate endpoints. Token and certificate HTTP requests have no retry or redirect, a ten-second operation deadline, and bounded bodies (64 KiB and 256 KiB respectively). Only identity content encoding is accepted. Request, response and socket termination are awaited before returning the HTTP slot. Certificate cache lifetime is bounded by provider freshness and six hours; freshly fetched non-cacheable certificates may be used for that operation but are not reused. An expired saved cache never substitutes for a failed fetch.

## Authentication and recovery

OAuth attempts expire ten minutes after creation. Additional link mail cannot extend that parent expiry. Google-only password addition requires a fresh same-subject reauthentication proof, valid for at most five minutes and never beyond its parent attempt. Existing third-party email accounts require their current password or a dedicated link-mail proof before linking or issuing a session. Ordinary email verification remains a separate 24-hour purpose; reset remains a separate one-hour purpose. Sessions keep their fixed 30-day expiry.

Callback/result GETs do not consume email proofs. Link-mail proof must be completed in its initiating browser. Method changes use a current authentication version and atomic last-method protection. Password change retains the current session's fixed expiry and invalidates other sessions; reset invalidates all old sessions. Google unlinking does not sign out all Hollow sessions or revoke another service's authorization.

On an uncertain code exchange, use the displayed explicit new-start action. Do not reload or automatically replay the authorization code. An interrupted `exchanging` attempt is retained until its fixed expiry; boot does not assume that another process's HTTP operation has ended. Late results remain subject to browser epoch, actor, authentication version and expiry checks. Stopping the runtime first stops authentication admission and waits for owned HTTP/hash operations before closing the database.

## Conditional real-provider verification

This procedure is **not run by default**. It requires explicit approval for external Google authentication and email delivery, an operator-owned test client and accounts, approved origins, a real mail adapter supplied through trusted server composition, and secure configuration/backup. `HOLLOW_MAIL_MODE=local` only writes a private mailbox; it does not establish external delivery. There is no production environment or HTTP switch for a fake provider.

Before granting external access, run the normal type/lint/format/unit checks and the Node authentication integration tests. They use synthetic claims, isolated databases, and owned loopback HTTP. Local contract browser testing may inject a provider/mailer through the trusted boot constructor, but must use the same application bundle, an isolated database, dedicated keys, bounded fixture accounts, and a clearly labeled local consent page. Such a result is not a successful Google login.

For an approved real-provider test:

1. Stop the single owned runtime, verify closure, and create an exclusive protected database/object/key backup. Use separate test data, not an existing user's password or login methods. Configure the exact callback and real adapter, then start the normal `boot()` path without constructor substitutions.
2. From a signed-out browser, start Google sign-in through the normal page. Complete Google consent and check the safe result page and signed-in account. Repeat with a verified existing authoritative address, a third-party address requiring additional proof, and an existing unverified account that must remain blocked. Do not capture callback query strings, tokens, authorization codes, provider subject values, cookies, passwords, or secret mail URLs.
3. Complete third-party password and link-mail proof separately. Opening a mail link must not consume it. A different browser must not complete link proof; the original browser must complete it once. Confirm ordinary verification still has its separate cross-browser behavior.
4. Test same-subject reauthentication for Google-only password addition and reject a different Google subject. Confirm last-method protection, other-session sign-out, current-session retention on password change, and all-old-session invalidation on reset.
5. Start OAuth, sign in/out in another tab of the same browser, then return the old result. It must not restore authentication. If a network exchange becomes uncertain, record the safe failure and use a new attempt rather than replaying the code. Do not deliberately weaken TLS or redirect validation to simulate success.
6. Exercise the existing invitation continuation and explicit join, then normal protected reads. Sign out normally, close the browser and stop the runtime. Check resource termination and audit only safe counts/status metadata. Ask before deleting material fixture data; keep protected account/key state if the product does not provide account deletion.

Record the exact source/bundle version, provider configuration status (not values), test time, safe branch outcomes, and whether the normal or substituted composition was used. Real Google/TLS behavior, consent configuration and external mail delivery remain unverified until this approved procedure succeeds.
