import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import signal
import sqlite3
import stat
import subprocess
import sys
import time

TREE = Path("/Users/hikaru/github.com/tuanemuy/hollow-p5d-c2a3d45f-20261006")
PUBLIC = Path("/Users/hikaru/github.com/tuanemuy/hollow")
ROOT = Path("/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-http-20261006-1c4b9f22")
TOOL_TMP = ROOT.with_name(ROOT.name + "-cert-tool-tmp")
TOOL_TMP_IDENTITY = None
ROOT_IDENTITY = None
LOADER = PUBLIC / ".goal-implement/helpers/p5d-native-http-loader.mjs"
LOADER_SHA = "9140de5a6de9f465c8c6aa42858a6f8dbd0028b673b58b594468b94f2aa74047"
CERTIFICATE_SHA = "5d51397c8d1021a132d3cf05957311869acb4801b2c9155c26c506d672f00f9b"
MANIFEST_SHA = "8089f5e7658bf0f9a603e3068af4a78fafe5def7f6aa84a853328e5ddd30a075"
NODE = Path("/nix/store/a5sxfwnzi3kzxrgj3zfngcqamdhnr161-nodejs-24.18.0/bin/node")
STAGES = ("native-http",)
CASES = ("HTTP01",)
CHECKPOINTS = {"account", "begin-callback", "adoption-ready", "native-ledger", "use-query", "use-count", "use-active", "caller-active", "closure-absent", "registry-empty-active", "origin-empty", "callback-result", "registry-empty-closed", "use-closed-acked", "attempt-completed", "origin-native", "connection-linked", "delete-accepted", "sweep", "attempts-cleared", "uses-cleared", "origin-cleared", "connection-cleared", "final-ledger"}
SAFE_FAILURES = {"GROUP_DEADLINE", "P5D_RESOURCE_DENIED", "P5D_TOOL_CLOSE", "P5D_CASE_FAILURE", "P5D_TOOL_FAILURE", "P5D_NODE_BINDING"}
MAX_BYTES = 2 * 1024**2
ERROR_CLASSES = {"unknown", "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "AssertionError", "LibsqlError", "LibsqlBatchError", "SqliteError", "DrizzleError", "DrizzleQueryError"}
NATIVE_CODES = {"none", "SQLITE_ERROR", "SQLITE_INTERNAL", "SQLITE_PERM", "SQLITE_ABORT", "SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_NOMEM", "SQLITE_READONLY", "SQLITE_INTERRUPT", "SQLITE_IOERR", "SQLITE_CORRUPT", "SQLITE_NOTFOUND", "SQLITE_FULL", "SQLITE_CANTOPEN", "SQLITE_PROTOCOL", "SQLITE_EMPTY", "SQLITE_SCHEMA", "SQLITE_TOOBIG", "SQLITE_CONSTRAINT", "SQLITE_MISMATCH", "SQLITE_MISUSE", "SQLITE_NOLFS", "SQLITE_AUTH", "SQLITE_FORMAT", "SQLITE_RANGE", "SQLITE_NOTADB", "SQLITE_NOTICE", "SQLITE_WARNING", "SQLITE_UNKNOWN", "ENOENT", "EEXIST", "EACCES", "EPERM", "ENOSPC", "ERR_DLOPEN_FAILED", "ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"}
DENIAL_METHODS = {"dns-query", "socket-connect", "server-listen", "tls-connect", "datagram-create", "node-worker", "child.fork", "child.fork-handles", "harness-argv", "harness-case", "harness-result"}
DENIAL_METHODS |= {"child." + name for name in ("spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync")}
DENIAL_METHODS |= {"fs.open-write", "fs.openSync-write", "fs.promises.open-write"}
DENIAL_METHODS |= {namespace + "." + name for namespace in ("fs", "fs.promises") for name in ("writeFile", "writeFileSync", "appendFile", "appendFileSync", "truncate", "truncateSync", "mkdir", "mkdirSync", "mkdtemp", "mkdtempSync", "rm", "rmSync", "rmdir", "rmdirSync", "unlink", "unlinkSync", "rename", "renameSync", "copyFile", "copyFileSync", "link", "linkSync", "symlink", "symlinkSync", "chmod", "chmodSync")}

class BoundaryError(Exception):
    pass

def require(value, code):
    if not value:
        raise BoundaryError(code)

def public_file(path, expected=None, maximum=MAX_BYTES):
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and not path.is_symlink() and before.st_uid == os.getuid() and before.st_nlink == 1 and before.st_size <= maximum, "public-file")
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        value = os.fstat(fd)
        require((value.st_dev, value.st_ino) == (before.st_dev, before.st_ino), "public-identity")
        data = b""
        while chunk := os.read(fd, 65536):
            data += chunk
            require(len(data) <= maximum, "public-size")
    finally:
        os.close(fd)
    after = path.lstat()
    require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns), "public-changed")
    if expected:
        require(hashlib.sha256(data).hexdigest() == expected, "source-hash")
    return data

def leader_presence(child):
    try:
        result = child.poll()
    except OSError:
        return "unproven"
    return "absent" if result is not None else "alive"

def own_group_state(group):
    if group is None:
        return "unproven"
    try:
        os.killpg(group, 0)
    except ProcessLookupError:
        return "absent"
    except OSError:
        return "unproven"
    return "alive"

def own_group_signal(group, value):
    if own_group_state(group) != "alive":
        return False
    try:
        os.killpg(group, value)
    except OSError:
        return False
    return True

def wait_own_group(child, group, seconds):
    deadline = time.monotonic() + seconds
    while True:
        leader_presence(child)
        state = own_group_state(group)
        if state != "alive" or time.monotonic() >= deadline:
            return state
        time.sleep(min(0.2, max(0, deadline - time.monotonic())))

def guard():
    identity = ROOT.lstat()
    require(ROOT_IDENTITY is not None and (identity.st_dev, identity.st_ino) == ROOT_IDENTITY, "root-identity")
    require(stat.S_ISDIR(identity.st_mode) and not ROOT.is_symlink() and ROOT.resolve(strict=True) == ROOT and identity.st_uid == os.getuid() and stat.S_IMODE(identity.st_mode) == 0o700, "root-boundary")
    tmp = TOOL_TMP.lstat()
    require(TOOL_TMP_IDENTITY is not None and (tmp.st_dev, tmp.st_ino) == TOOL_TMP_IDENTITY and stat.S_ISDIR(tmp.st_mode) and not TOOL_TMP.is_symlink() and TOOL_TMP.resolve(strict=True) == TOOL_TMP and tmp.st_uid == os.getuid() and stat.S_IMODE(tmp.st_mode) == 0o700, "tool-tmp-boundary")
    require(tmp.st_size <= 8 * 1024**2 and not list(TOOL_TMP.iterdir()), "tool-tmp-empty")
    total = 0
    databases = 0
    certificates = 0
    entries = list(ROOT.iterdir())
    require(len(entries) <= 9, "root-entry-bound")
    for path in entries:
        value = path.lstat()
        if path.name == "openrouter-owner":
            require(stat.S_ISDIR(value.st_mode) and not path.is_symlink() and value.st_uid == os.getuid() and stat.S_IMODE(value.st_mode) == 0o700 and path.resolve(strict=True) == path, "owner-directory")
            owner_files = list(path.iterdir())
            require(len(owner_files) <= 3, "owner-entry-bound")
            for entry in owner_files:
                require(entry.name in ("owner.json", "recovery.lock") or re.fullmatch(r"owner-[a-f0-9-]{36}\.tmp", entry.name), "owner-path")
                try:
                    info = entry.lstat()
                except FileNotFoundError:
                    require(entry.name == "recovery.lock" or re.fullmatch(r"owner-[a-f0-9-]{36}\.tmp", entry.name), "owner-disappeared")
                    continue
                require(stat.S_ISREG(info.st_mode) and not entry.is_symlink() and info.st_uid == os.getuid() and info.st_nlink == 1 and stat.S_IMODE(info.st_mode) == 0o600 and info.st_size <= 16384, "owner-file")
                total += info.st_size
            continue
        require(path.name in ("native-http.db", "native-http.db-wal", "native-http.db-shm", "openrouter.key", "openrouter.json", "tls.key", "tls.crt", "tls-request.cnf"), "root-unknown-entry")
        require(stat.S_ISREG(value.st_mode) and not path.is_symlink() and value.st_uid == os.getuid() and value.st_nlink == 1 and stat.S_IMODE(value.st_mode) == 0o600, "file-boundary")
        require(path.name != "openrouter.key" or 0 <= value.st_size <= 32, "key-size")
        require(path.name != "openrouter.json" or value.st_size <= 16384, "config-size")
        if path.name in ("tls.key", "tls.crt"):
            certificates += value.st_size
        require(path.name != "tls-request.cnf" or value.st_size <= 16384, "tls-config-size")
        if path.name.startswith("native-http.db"):
            databases += value.st_size
        total += value.st_size
    require(certificates <= 64 * 1024, "key-cert-size")
    require(databases <= 32 * 1024**2 and total + tmp.st_size <= 192 * 1024**2, "root-size")
    return total

def preflight():
    require(sys.version_info[:3] == (3, 14, 3), "python-version")
    require(TREE.resolve(strict=True) == TREE and stat.S_IMODE(TREE.lstat().st_mode) == 0o700, "tree-boundary")
    require(not os.path.lexists(ROOT), "fresh-root")
    require(not os.path.lexists(TOOL_TMP), "fresh-cert-tool-tmp")
    require(ROOT.parent.resolve(strict=True) == ROOT.parent and ROOT.parent.is_dir(), "root-parent")
    require(stat.S_IMODE(LOADER.lstat().st_mode) == 0o600, "loader-mode")
    public_file(LOADER, LOADER_SHA)
    require(stat.S_IMODE((PUBLIC / ".goal-implement/helpers/p5d-native-http-certificate.py").lstat().st_mode) == 0o600, "certificate-source-mode")
    public_file(PUBLIC / ".goal-implement/helpers/p5d-native-http-certificate.py", CERTIFICATE_SHA)
    report = public_file(PUBLIC / ".goal-implement/phases/P5d-native-http-implementation.md").decode("utf-8", "strict")
    rows = re.findall(r"\| `((?:apps|packages)/[^`]+)` \| [^\n]+? \| `([a-f0-9]{64})` \|", report)
    require(len(rows) == 89 and len(set(path for path, _ in rows)) == 89, "manifest-count")
    require(hashlib.sha256("".join(path + " " + sha + "\n" for path, sha in sorted(rows)).encode()).hexdigest() == MANIFEST_SHA, "manifest-frozen")
    for path, sha in rows:
        require(".." not in Path(path).parts, "source-path")
        public_file(TREE / path, sha)
        if path.endswith(("accountDeletionNativeHttp.integration.test.ts", "accountDeletionNativeHttpFixtures.ts")):
            require(stat.S_IMODE((TREE / path).lstat().st_mode) == 0o600, "fixture-source-mode")
    require((TREE / "apps/web/node_modules/@repo/core").resolve(strict=True) == TREE / "packages/core", "self-core")
    node_metadata = NODE.lstat()
    require(NODE.resolve(strict=True) == NODE and stat.S_ISREG(node_metadata.st_mode) and not NODE.is_symlink() and node_metadata.st_uid == 0 and node_metadata.st_nlink == 2 and node_metadata.st_size == 68720016 and stat.S_IMODE(node_metadata.st_mode) == 0o555, "public-node")
    vitest = json.loads(public_file(TREE / "node_modules/vitest/package.json"))
    require(vitest["version"] == "4.1.6", "vitest-version")
    journal = json.loads(public_file(TREE / "packages/core/src/adapters/libsql/migrations/meta/_journal.json"))
    require(journal["entries"][-1]["tag"] == "0044_account_deletion", "formal-migration")
    require(len(journal["entries"]) == 45, "migration-entry-bound")
    batch_count = 0
    for entry in journal["entries"]:
        require(re.fullmatch(r"[0-9]{4}_[a-z0-9_]+", entry["tag"]) is not None, "migration-tag")
        source = public_file(TREE / "packages/core/src/adapters/libsql/migrations" / (entry["tag"] + ".sql")).decode("utf-8", "strict")
        batch_count += len(source.split("--> statement-breakpoint")) + 1
    require(batch_count == 1534, "migration-statement-bound")
    return len(journal["entries"])

def audit(migrations):
    result = {}
    for stage in STAGES:
        path = ROOT / (stage + ".db")
        identity = path.lstat()
        require(stat.S_ISREG(identity.st_mode) and identity.st_nlink == 1 and not path.is_symlink(), "audit-file")
        connection = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=1)
        try:
            connection.execute("PRAGMA query_only=ON")
            require(connection.execute("PRAGMA query_only").fetchone() == (1,), "audit-query-only")
            require(connection.execute("PRAGMA foreign_key_check").fetchall() == [], "audit-fk")
            require(connection.execute("PRAGMA integrity_check").fetchall() == [("ok",)], "audit-integrity")
            def number(sql):
                row = connection.execute(sql).fetchone()
                require(row is not None and len(row) == 1 and isinstance(row[0], int), "audit-count")
                return row[0]
            require(number("SELECT count(*) FROM __drizzle_migrations") == migrations, "audit-migrations")
            require(number("SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'p5d_%'") >= 79, "audit-formal-guards")
            require((ROOT / "openrouter.key").lstat().st_size == 32, "audit-aes-size")
            require(number("SELECT count(*) FROM accounts WHERE state='deleted'") == 1, "audit-anchor")
            require(number("SELECT count(*) FROM accounts a JOIN account_deletions d ON d.id=a.deletion_id AND d.account_id=a.id AND d.fence_auth_version=a.auth_version WHERE a.state='deleted' AND a.email IS NULL AND a.password_hash IS NULL AND a.created_at IS NULL AND a.verified_at IS NULL") == 1, "audit-anchor-fence")
            require(number("SELECT count(*) FROM sessions") == 0, "audit-session-fence")
            require(number("SELECT count(*) FROM account_deletion_credential_uses") == 0, "audit-native-http-uses-drained")
            require(number("SELECT count(*) FROM openrouter_attempts") == 0, "audit-native-http-attempts-drained")
            require(number("SELECT count(*) FROM account_deletion_credential_origins") == 0, "audit-native-http-origins-drained")
            require(number("SELECT count(*) FROM openrouter_connections WHERE credential_envelope IS NOT NULL OR provider_user_id IS NOT NULL") == 0, "audit-native-http-target-copies")
            require(number("SELECT count(*) FROM accounts") == 1 and number("SELECT count(*) FROM auth_browser_contexts") <= 1 and number("SELECT count(*) FROM notes") == 0 and number("SELECT count(*) FROM workspaces") == 0, "audit-entity-bound")
            result[stage] = {"foreignKeys": True, "integrity": True, "anchorFence": True, "nativeHttpTargetCopiesRemoved": True, "readonlyClosed": True}
        finally:
            connection.close()
        after = path.lstat()
        require((identity.st_dev, identity.st_ino, identity.st_size, identity.st_mtime_ns) == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns), "audit-database-changed")
    guard()
    return result

def main():
    global TOOL_TMP_IDENTITY, ROOT_IDENTITY
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    migrations = preflight()
    if not args.execute:
        print(json.dumps({"preflight": True, "executed": False, "database": 0, "newRoot": 0}, separators=(",", ":")))
        return
    os.mkdir(ROOT, 0o700)
    root_identity = ROOT.lstat()
    ROOT_IDENTITY = (root_identity.st_dev, root_identity.st_ino)
    os.mkdir(TOOL_TMP, 0o700)
    tmp_identity = TOOL_TMP.lstat()
    TOOL_TMP_IDENTITY = (tmp_identity.st_dev, tmp_identity.st_ino)
    guard()
    started = time.monotonic()
    certificate_scope = {"__name__": "p5d_certificate_source"}
    certificate_bytes = public_file(PUBLIC / ".goal-implement/helpers/p5d-native-http-certificate.py", CERTIFICATE_SHA)
    exec(compile(certificate_bytes, "p5d-native-http-certificate.py", "exec"), certificate_scope)
    certificate_receipt = certificate_scope["generate"]()
    require(certificate_receipt.get("actualExit") == 0 and certificate_receipt.get("stdoutEOF") is True and certificate_receipt.get("stderrEOF") is True and certificate_receipt.get("pipeHandlesClosed") is True and certificate_receipt.get("ownPGState") == "absent" and certificate_receipt.get("forced") is False and certificate_receipt.get("opensslChildren") == 1, "certificate-closure")
    guard()
    supervisor_pgid = os.getpgid(0)
    require(supervisor_pgid > 0, "supervisor-pg")
    child = subprocess.Popen([str(NODE), str(LOADER), str(ROOT)], cwd=TREE, env={"PATH": str(NODE.parent) + ":/usr/bin:/bin", "HOLLOW_ACCOUNT_DELETION_HTTP_ROOT": str(ROOT), "TMPDIR": str(TOOL_TMP), "HOLLOW_P5D_TOOL_TMP_IDENTITY": json.dumps({"dev": TOOL_TMP_IDENTITY[0], "ino": TOOL_TMP_IDENTITY[1]}, separators=(",", ":")), "NODE_ENV": "test", "CI": "1", "NO_COLOR": "1", "PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN": "false"}, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    selector = selectors.DefaultSelector()
    for stream in (child.stdout, child.stderr):
        selector.register(stream, selectors.EVENT_READ)
    buffer = b""
    bytes_read = 0
    packets = []
    normal = False
    own_pg = None
    pg_state = "unproven"
    term_sent = False
    kill_sent = False
    stage_started = None
    summary_seen = False
    failure = None
    eof = set()
    normal_pipe_receipt = None
    try:
        require(os.getpgid(child.pid) == child.pid and child.pid != supervisor_pgid, "tool-pg")
        own_pg = child.pid
        while selector.get_map() or child.poll() is None:
            elapsed = time.monotonic() - started
            require(elapsed <= 210, "outer-deadline")
            require(summary_seen or elapsed <= 180, "body-deadline")
            require(stage_started is None or summary_seen or time.monotonic() - stage_started <= 180, "suite-deadline")
            guard()
            for key, _ in selector.select(0.2):
                data = os.read(key.fd, 65536)
                if not data:
                    eof.add(key.fileobj)
                    selector.unregister(key.fileobj)
                    continue
                bytes_read += len(data)
                require(bytes_read <= MAX_BYTES, "output-bound")
                if key.fileobj is child.stdout:
                    buffer += data
                    require(len(buffer) <= MAX_BYTES, "line-bound")
                    while b"\n" in buffer:
                        line, buffer = buffer.split(b"\n", 1)
                        if not line.startswith(b"P5D "):
                            continue
                        packet = json.loads(line[4:])
                        require(packet.get("event") in {"fork", "stage", "case", "closed", "failure", "summary", "denial", "diagnostic", "fixture-closed", "tls-closed", "checkpoint"}, "event-enum")
                        if packet["event"] == "diagnostic":
                            require(set(packet) == {"event", "stage", "phase", "beforeAllStarted", "beforeAllEnded", "afterAllStarted", "afterAllEnded", "source", "errors"}, "diagnostic-shape")
                            require(not any(value["event"] == "diagnostic" for value in packets), "diagnostic-bound")
                            require(packet["stage"] in (*STAGES, "bootstrap") and packet["phase"] in {"bootstrap", "create", "start", "results", "close", "wait-closed"} and packet["source"] in {"none", "suite", "module", "unhandled", "harness", "case"}, "diagnostic-enum")
                            require(all(type(packet[name]) is bool for name in ("beforeAllStarted", "beforeAllEnded", "afterAllStarted", "afterAllEnded")), "diagnostic-hooks")
                            require(isinstance(packet["errors"], list) and len(packet["errors"]) <= 3 and all(isinstance(value, dict) and set(value) == {"errorClass", "nativeCode", "statementIndex"} and value["errorClass"] in ERROR_CLASSES and value["nativeCode"] in NATIVE_CODES and (value["statementIndex"] is None or value["errorClass"] == "LibsqlBatchError" and type(value["statementIndex"]) is int and 0 <= value["statementIndex"] < 1534) for value in packet["errors"]), "diagnostic-errors")
                        if packet["event"] == "checkpoint":
                            require(set(packet) == {"event", "case", "key"} and packet["case"] == "HTTP01" and type(packet["key"]) is str and packet["key"] in CHECKPOINTS and not any(value["event"] == "checkpoint" for value in packets), "checkpoint-shape")
                            packet = {"event": "checkpoint", "case": "HTTP01", "key": packet["key"]}
                        if packet["event"] == "denial":
                            require(set(packet) == {"event", "method", "context"} and packet["method"] in DENIAL_METHODS and packet["context"] in {"node-main", "vitest-fork"}, "denial-enum")
                        if packet["event"] == "tls-closed":
                            expected_keys = {"event", "accepted", "acceptedClosed", "tlsSockets", "tlsSocketClosed", "clientSockets", "clientSocketClosed", "requests", "requestClosed", "responseClosed", "listenerClosed"}
                            require(set(packet) == expected_keys and all(value == 2 and type(value) is int for key, value in packet.items() if key not in ("event", "listenerClosed")) and packet["listenerClosed"] is True and not any(value["event"] == "tls-closed" for value in packets), "tls-closure")
                        if packet["event"] == "fixture-closed":
                            require(set(packet) == {"event", "executionStopped", "clientClosed", "listenerClosed"} and packet["executionStopped"] is True and packet["clientClosed"] is True and packet["listenerClosed"] is True and not any(value["event"] == "fixture-closed" for value in packets), "fixture-closure")
                        if packet["event"] == "fork":
                            require(isinstance(packet.get("pid"), int) and os.getpgid(packet["pid"]) == child.pid, "fork-pg")
                            packet = {"event": "fork", "sameOwnedPG": True}
                        if packet["event"] in {"stage", "case", "closed", "failure"}:
                            require(packet.get("stage") in (*STAGES, "bootstrap"), "stage-enum")
                        if packet["event"] == "case":
                            require(packet.get("code") in CASES and packet.get("state") in {"passed", "failed", "skipped", "pending"}, "case-enum")
                        if packet["event"] == "failure":
                            require(packet.get("code") in SAFE_FAILURES and packet.get("case") in (*CASES, "none"), "failure-enum")
                        if packet["event"] == "stage":
                            stage_started = time.monotonic()
                        if packet["event"] == "summary":
                            summary_seen = True
                        packets.append(packet)
                        require(len(packets) <= 40, "event-bound")
        child.wait(timeout=1)
        require(child.returncode == 0 and len(eof) == 2, "tool-exit-or-eof")
        pg_state = own_group_state(own_pg)
        require(pg_state == "absent", "tool-pg-" + pg_state)
        summary = [packet for packet in packets if packet["event"] == "summary"]
        require(len(summary) == 1 and summary[0].get("ok") is True and summary[0].get("completed") == list(STAGES) and summary[0].get("forks") == 1 and summary[0].get("forksActualClosed") is True and summary[0].get("denied") is False and not any(packet["event"] in {"denial", "diagnostic", "checkpoint"} for packet in packets), "tool-summary")
        require([packet["code"] for packet in packets if packet["event"] == "case"] == list(CASES), "case-order")
        require(all(packet["state"] == "passed" for packet in packets if packet["event"] == "case"), "case-results")
        require([packet["stage"] for packet in packets if packet["event"] == "closed"] == list(STAGES), "afterall-close")
        require(len([path for path in ROOT.iterdir() if path.name.endswith(".db")]) == 1, "logical-database-count")
        require(len([packet for packet in packets if packet["event"] == "fixture-closed"]) == 1, "actual-fixture-close")
        require(len([packet for packet in packets if packet["event"] == "tls-closed"]) == 1, "actual-tls-close")
        child.stdout.close()
        child.stderr.close()
        normal_pipe_receipt = {"stdoutCloseReturned": True, "stderrCloseReturned": True, "stdoutClosed": child.stdout.closed, "stderrClosed": child.stderr.closed}
        require(all(normal_pipe_receipt.values()), "normal-pipe-close")
        normal = True
        require(time.monotonic() - started < 240, "audit-deadline")
        def audit_timeout(_signum, _frame):
            raise BoundaryError("audit-deadline")
        signal.signal(signal.SIGALRM, audit_timeout)
        signal.setitimer(signal.ITIMER_REAL, 240 - (time.monotonic() - started))
        try:
            audits = audit(migrations)
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
    except (BoundaryError, OSError, ValueError, sqlite3.Error) as error:
        failure = str(error) if isinstance(error, BoundaryError) else "RUNNER_FAILURE"
        pg_state = own_group_state(own_pg)
        force_end = min(started + 240, time.monotonic() + 30)
        if pg_state == "alive" and time.monotonic() < force_end:
            term_sent = own_group_signal(own_pg, signal.SIGTERM)
            pg_state = wait_own_group(child, own_pg, max(0, min(10, force_end - time.monotonic())))
            if pg_state == "alive" and time.monotonic() < force_end:
                kill_sent = own_group_signal(own_pg, signal.SIGKILL)
                pg_state = wait_own_group(child, own_pg, max(0, min(10, force_end - time.monotonic())))
        leader_presence(child)
        pipe_deadline = min(force_end, time.monotonic() + 10)
        while selector.get_map() and time.monotonic() < pipe_deadline:
            for key, _ in selector.select(0.2):
                data = os.read(key.fd, 65536)
                bytes_read += len(data)
                if bytes_read > MAX_BYTES:
                    break
                if not data:
                    eof.add(key.fileobj)
                    selector.unregister(key.fileobj)
        audits = None
    finally:
        selector.close()
        child.stdout.close()
        child.stderr.close()
    pg_state = own_group_state(own_pg)
    leader_state = leader_presence(child)
    if pg_state != "absent" or leader_state != "absent":
        failure = failure or "tool-closure-unproven"
    print(json.dumps({"ok": failure is None, "failure": failure, "normalExit": normal and not term_sent and not kill_sent, "forcedTerm": term_sent, "forcedKill": kill_sent, "actualExit": child.returncode, "stdoutEOF": child.stdout in eof, "stderrEOF": child.stderr in eof, "pipeHandlesClosed": child.stdout.closed and child.stderr.closed, "normalPipeCloseReceipt": normal_pipe_receipt, "certificate": certificate_receipt, "supervisorPGObserved": True, "helperOwnPGObserved": own_pg is not None, "ownPGState": pg_state, "leaderState": leader_state, "pollMs": 200, "elapsedMs": round((time.monotonic() - started) * 1000), "outputBytes": bytes_read, "events": packets, "audits": audits, "held": failure is not None}, separators=(",", ":")))
    if failure: sys.exit(1)

if __name__ == "__main__":
    os.umask(0o077)
    try:
        main()
    except Exception as error:
        print(json.dumps({"ok": False, "failure": str(error) if isinstance(error, BoundaryError) else "PREFLIGHT_FAILURE", "held": True}, separators=(",", ":")))
        sys.exit(1)
