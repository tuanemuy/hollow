# P5c UI job BUILD B-GIT-PG1 correction

Status: PUBLIC runner-only candidate fixed. Actual/default preflight/Git reader/source materialization/root probe/Node import/build/native/runtime/DB/browser remain 0. All readers/writers/runtime STOP after this report; independent proportional review and separate Root execution adoption are required.

## Fixed files and scope

- Changed helper: p5c-ui-job-libsql-build.py, 25775B, SHA-256 ec269455b0af834c037c7ef76672cf5497316044c89f87d25615da6332d9c1ab; canonical regular600/UID501/nonlink/nlink1/NOFOLLOW/full stable read/hash.
- Driver unchanged: 9182B, fab719add4dc74f1f9a53121a61b9033b93a6562cd47375a989aefb8125b7617.
- Packed manifest unchanged: 117081B, be5f62d1617cf269d6bfb0f384d70fbe7b9b038f9b5ba8c9f823ab9e2b57ba5d.
- Prior candidate phase13460/2322cb7879ae6f7b90b3e82e6ae04096e4a6e86d2613a766b761993c31b64bf3 is immutable history; this separate new phase supersedes only its runner SHA/material calculation/Git failure-recovery description.
- Independent review8986/8e3693c1d0433345a606d929879c6ebceb1e6d18ff979de9daf007332abeef11 was stable read and used for the exact B-GIT-PG1 correction.

No driver/schema/packed source/dependency/account/native/build options/normal output manifest/Node supervisor/protocol change. Immutable Git79/source327/1920009B, dependency707/13984808B, aliases10/links6 and SOURCE/build-a0632bfd/TMP literals remain fixed and UNPROBED. No main/working source/B/private/old actual roots/logs/key/proof access or source/product change.

## Exact changed role

Only source_objects, from function declaration through output=bytes(output), changed; the existing blob parse loop and all surrounding runner bytes remain exact. Bookkeeping is initialized before Popen, then the original known Git PID/PG belongs to the try/finally scope immediately after successful Popen. No second reader process, unknown PID lookup, scan, cleanup root, retries, or new packet is added.

Normal source return requires all separately observed conditions: original reader body complete, no failed branch, no forced signal attempt, original actual leader wait exit0, final known PG absent=True, both original stdout/stderr actual EOF, original stdin/stdout/stderr successful close plus closed flags, stderr count0. Only after that gate does the unchanged source blob/hash parse run. PG absent=None stays unproven; leader wait does not fill it.

On any setup/read/selector/10s deadline/normal-gate exception:
1. Failure persists and retained stdout is cleared. Recovery bytes are discarded, not parsed or returned as source.
2. Original leader exit and original known PG absent/alive/unproven are checked independently. TERM is attempted for alive/unproven ownership even when leader wait is already complete.
3. A bounded observer is restored only for the two already-owned original pipe FDs. Setup failures and unknown reads leave EOF missing, never synthesized. Both streams drain during recovery.
4. After the TERM window, KILL is attempted if original PG still alive/unproven or leader actual wait is missing. An exited leader does not suppress KILL for a surviving/unknown group.
5. Original actual wait and final known PG state are retained separately. Original stdin/stdout/stderr close flags are recorded independently. Failure remains held even if all cleanup receipts later complete.

TERM/KILL syscall return enums are kept separately from PG observation: not-attempted/sent-success/ESRCH-absent/EPERM-unknown/other-unknown. A successful send or ESRCH syscall is not directly promoted into PG absence. Leader poll/wait observation errors remain unproven. Selector/read observation exceptions cannot bypass the subsequent known-group stop stage. Failed-reader stdin is made nonblocking before close where still open; an unknown setup/close outcome remains unproven/held, not actual FD closure proof.

This is source-derived reachable-code correction, not evidence that any Git hang, descendant, signal, or lost pipe occurred. No actual reader has been run.

## Bounds and proportional checks

The reader body remains10s. Failure recovery preserves the previous maximum2s stop allocation, shared by TERM≤1s, subsequent KILL/drain in the remaining≤1s; pipe drain runs within these same windows and does not add time. Thus source-reader role is at most10+2s, not native build body60/tail30. No extra attempt or process count is introduced. All final checks stay source only and do not use native service closure receipts.

Runner delta+4037B. Helper sum152038B + control32768B + summary4096B = 188902B, below256KiB. Packed payload, frame512B/16frames8192B, normal4frames509B/max256B, all source/output/TMP/log/root caps, native build body60/sharedtail30, and Node supervision are unchanged.

Python AST and compile (no evaluation/import) PASS. Stable NOFOLLOW metadata/fullSHA of candidate PASS; stable fullSHA driver and manifest directly unchanged. Source/runtime/default preflight/tests were not executed; no whole pnpm check is necessary because this delegation changes only the PUBLIC helper. Direct whole-byte inverse replaces exactly the new source_objects prefix with the following old prefix:21738B/SHA 9964056ebce51fbf0fb15d1d1601fd50487cbb25382053aebbeb638498c685d3. The inverse bytes matched exactly, not merely a line diff. Everything outside this correction is unchanged.

## Inverse base prefix

The replacement ends at the first output=bytes(output) line within source_objects. The old prefix below is sufficient to reconstruct the prior full runner from the fixed new runner.

```python
def source_objects(m):
    # This one immutable-object reader precedes the native build process scope.
    data = ("\n".join(r["gitBlob"] for r in m["source"]) + "\n").encode()
    env = {"PATH": "/usr/bin:/bin", "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_NO_LAZY_FETCH": "1"}
    child = subprocess.Popen([GIT, "--git-dir=" + GIT_DIR, "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, cwd="/", start_new_session=True)
    selector = None
    output = bytearray()
    discarded_count = 0
    read_eof = [False, False]
    deadline = time.monotonic() + 10
    try:
        child.stdin.write(data)
        child.stdin.close()
        selector = selectors.DefaultSelector()
        for index, stream in enumerate((child.stdout, child.stderr)):
            os.set_blocking(stream.fileno(), False)
            selector.register(stream.fileno(), selectors.EVENT_READ, index)
        while not all(read_eof):
            require(time.monotonic() < deadline)
            for key, _ in selector.select(0.05):
                block = os.read(key.fd, 65536)
                if not block:
                    read_eof[key.data] = True
                    selector.unregister(key.fd)
                elif key.data == 0:
                    output.extend(block)
                    require(len(output) <= 4 * MIB)
                else:
                    discarded_count += len(block)
                    require(discarded_count <= 4096)
        require(child.wait(timeout=max(0, deadline - time.monotonic())) == 0)
        require(discarded_count == 0 and group_absent(child.pid) is True)
    except BaseException:
        send_owned(child.pid, signal.SIGTERM)
        try:
            child.wait(timeout=1)
        except subprocess.TimeoutExpired:
            send_owned(child.pid, signal.SIGKILL)
            child.wait(timeout=1)
        raise
    finally:
        if selector is not None:
            selector.close()
        for stream in (child.stdin, child.stdout, child.stderr):
            if stream is not None:
                stream.close()
    output = bytes(output)
```

## Stop and acceptance boundary

ALL candidate reader/writer/runtime STOP. New source/build/TMP have not been probed or created. Current and all old private/source-B/failure roots were not operated. The UI Node -6 cause remains UNKNOWN; native job/fixture/Worker admission/normal UI/nativeproof/P5d completion have not been implemented or accepted by this helper correction.
