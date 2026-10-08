# UI build startup diagnostic plan: independent limited review

Result: LIMITED PLAN PASS. No major contradiction found in the proposed held-frame diagnostic contract. This accepts the proposal, not its implementation, a new execution, source closure, generated outputs, service closure, libSQL/job operation, or UI acceptance. Actual failure cause remains UNKNOWN; individual service closure remains NULL/unreceived.

Reviewed at: 2026-10-06T09:00:35.397793+00:00

## Fixed PUBLIC inputs

| Input | Bytes | SHA256 |
| --- | ---: | --- |
| phases/P5c-ui-job-libsql-build-startup-plan.md | 14888 | 08b2695526eda1b9595d72e513339a39ebd72d8e661cd1c6efe560b50935d707 |
| helpers/p5c-ui-job-libsql-build.py | 25775 | ec269455b0af834c037c7ef76672cf5497316044c89f87d25615da6332d9c1ab |
| helpers/p5c-ui-job-libsql-build-driver.mjs | 9182 | fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617 |
| helpers/p5c-ui-job-libsql-build-manifest.json | 117081 | be5f62d1617cf269d6bfb0f384d70fbe7b9b038f9b5ba8c9f823ab9e2b57ba5d |
| phases/P5c-ui-job-libsql-build-actual.md | 4183 | e4633285bd51725e1827ef52e3d343478927ff34f1058fb1d752f68e9aeffe13 |
| reviews/P5c-ui-job-libsql-build-actual.md | 7432 | fface59114032d4551bf4090c305ed36911acd1c110659fb96d4b064527d8873 |

All six were fully read and rechecked as canonical regular600/nonlink/nlink1/selfUID with NOFOLLOW, path/FD pre-post stable identity and timestamps, exact bytes/SHA, and actual reader FD close. Packed bytes were checked without inflating or rereading dependency/source bodies. Existing runner output was initially truncated, so only the same PUBLIC file's capacity/decode/monitor sections were displayed separately. No installed esbuild source/package/binary reread was needed for this narrow contract review. The plan's original esbuild analysis and prior source/dependency closure are borrowed, not independently re-proved here.

## Reachable guard coverage

The following correspondence is source-derived from the fixed driver. It records the implementation constraints already required by plan lines 72–80; it does not propose extra frames or diagnostics.

| Existing site | First sticky reason | Last reachable phase / missing boundary |
| --- | --- | --- |
| Driver 10–43 envelope/runtime/dependency verification; 103 service-module binding; setup errors outside the current catch | UNKNOWN if a held frame can be emitted; otherwise NULL in outer summary | SETUP or NULL when no held frame is received. A header does not prove later setup/import. No new catch/normal frame is implied. |
| Driver 47–51 existing spawn comparisons | SPAWN_BINDING | Current statement phase, potentially BUILD_PENDING. First reason persists even if service is subsequently emitted. |
| Driver 54 extra child; 56 original child error | EXTRA_CHILD / CHILD_ERROR | Current statement phase only; no original error properties are read. |
| Driver 60 registration predicate; 63/66 original stream errors | SERVICE_REGISTRATION / STDIN_ERROR / STDOUT_ERROR | Current phase; service receipt does not erase earlier held or prove stream closure. |
| Driver 70 Worker publication; 71 existing remoteAddress comparison | WORKER_OBSERVED / REMOTE_SOCKET | Current phase; no new Worker/socket inspection or permission grant. |
| Driver 75–83 resolve/load policy | RESOLVE_SCOPE / LOAD_SCOPE for the existing computed reject; UNKNOWN for original next/file conversion exceptions without a known reject | Current phase. Original next is called in the same order and its result/error is preserved. No new canonical lookup or unknown-error accessor. |
| Driver 91–102 original port/addon deny | PORT_DENIED | Current phase; all existing denials retain their original throw/held behavior. |
| Driver 107 import; 109–117 original build await | UNKNOWN for otherwise unclassified original rejection | IMPORT_PENDING / BUILD_PENDING, updated to IMPORT_RETURNED / BUILD_RETURNED only after actual resolution. No internal native cause is inferred. |
| Driver 108 deadline | DEADLINE | Last actually reached phase; timer expiry cannot imply original await completion. |
| Driver 119 return checks | BUILD_HELD for already-held rejection / BUILD_RESULT for the other existing count/child/result predicates | BUILD_RETURNED. Preserve existing short-circuit reads: diagnostics must not inspect result fields that the original predicate skipped. Earlier sticky reason is not overwritten. |
| Driver 121–124 canonical input membership | INPUT_SCOPE for existing membership rejection; UNKNOWN for original field/realpath exceptions | INPUT_CHECK. Do not turn malformed metadata or read failures into a proved scope cause. |
| Driver 126–128 expected output comparison | OUTPUT_SET for existing mismatch; UNKNOWN for other original exceptions | OUTPUT_CHECK. No prefix/suffix/alternative output acceptance. |
| Driver 129 / 142 emit bound/write | FRAME_LIMIT / FRAME_WRITE | BUILT_FRAME / CLOSED_FRAME marks attempted statement only, never successful frame acceptance. The same rule applies to service/header/catch emits. |
| Driver 133 original stdin end; 134–138 closure | UNKNOWN for original stdin-end exception / CLOSURE_HELD for existing held branch / CLOSURE_RESULT for original exit/signal/stream/count reject | STDIN_END / SERVICE_CLOSE. Wait incompletion stays missing until the original deadline/other rejection. |
| Driver 140 original stop | UNKNOWN for original stop rejection | ORIGINAL_STOP, advanced only by original operation completion. Stop return is not independent native closure proof. |
| Driver 143–150 catch/finally and catch held-frame failure | UNKNOWN only when no earlier reason exists; FRAME_LIMIT/FRAME_WRITE only at their fixed local decision sites | Last actually reached phase. If held emission fails, outer retains last accepted event and phase/reason NULL. No successful diagnostic receipt is synthesized. |

All 21 proposed reasons have an existing decision site, and all 12 phases have a fixed driver boundary. Stateful callbacks record only constant reason at an existing decision. `held` callbacks that currently receive an error argument must use a fixed-site wrapper or equivalent ignoring that argument; an error object must never become a reason, trigger property reads, or escape the finite decoder. This is an implementation check under the plan's no-accessor/unchanged-original-semantics contract, not a request to change the error listener or handler's behavior.

First reason is initialized missing, set once, and preserved through build/closure/catch rejection. Phase is independent and records only actual progression. In particular driver 51 can set held before driver 67 emits service; await at 109 can then reject with BUILD_PENDING while SPAWN_BINDING remains first. Neither receipt proves an original predicate passed, a native cause, or a completed service. UNKNOWN error instances remain unread; original receiver/arguments/result/Promise/proof are preserved, and no callback acquires a new throwing diagnostic path.

## Outer failure separation and normal gates

Runner 354–382 capacity checks, 385–412 strict decoder and event order, 443–480 resource/IO/buffer/control/raw cap decisions, 447–515 body/tail/PG/cleanup, and normal postprocess/preflight/materialize failures remain outer faults. They must not supply inner reason/phase without a valid inner held frame. Invalid enum/schema, service PID/PG mismatch, incomplete/control frames or decoder/IO failure retain held and may leave inner metadata NULL. This plan intentionally adds no outer-cause enum and performs no retroactive classification of the failed run.

Runner 528 still requires no fault, no force, actual Node exit0, ownPG absent, actual EOF on all three readers, actual close on all four FDs, empty control remainder, and exactly header/service/built/closed. Driver 134–142 still requires original child exit/close and stdout end-close/stdin finish-close, original stop, and unchanged closed frame. Proposed held schema cannot substitute for any of them. Output capacity/full hash/file count and manifest creation remain separate normal postprocess requirements. Native closure NULL is not replaced by outer TERM/PGabsence/EOF/FD4 or by phase/reason.

## Finite bounds and scope

Independently enumerated 12 phases plus NULL × 21 reasons plus NULL using compact ASCII JSON and newline: maximum held-frame size92B. Each frame remains below512B; maximum16 × 512 =8192B remains within control32KiB. No additional frames are proposed. Current material sum117081 +9182 +25775 +32768 +4096 =188902B, below262144B with73242B remaining. New implementation bytes and SHA must be recalculated before any later run; this review does not preapprove arbitrary growth.

BODY60/sharedtail30, guard200ms, root192MiB/source32/output16/TMP8/log2/material256KiB, child1, Worker/addon/DB/network0 and original known NodePG supervision are unchanged. Existing header/service/built/closed schema/order and bound source/dependency/build options remain unchanged. Diagnostic fields are fixed enums/NULL, not raw names/messages/stack/SQL/path/body/arguments/proof or ambient causation.

Only this new review was written, by exclusive wx600 with fsync and actual FD close, then stable postread/fullhash. Product/helper/source/manifest/management changes0; source import, Git subprocess, installed dependency scan, Node/default/preflight/runtime/build/test/DB/Worker/browser/network/rootprobe/create0. Generated UI SOURCE/BUILD-a063/TMP, S5 success6074/failed341 and all old private roots remained completely nonoperative. No skill spec/spec-implement, goal API or agent delegation.

All PUBLIC input reader FDs and this report writer/reader FD are closed. All task readers/writers/runtime are STOP after report binding is returned. Further implementation or execution requires Root's separate scope adoption.
