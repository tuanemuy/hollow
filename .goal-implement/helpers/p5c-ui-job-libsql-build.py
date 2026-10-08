#!/usr/bin/env python3
import base64
import errno
import hashlib
import json
import os
import selectors
import signal
import stat
import subprocess
import sys
import time
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "p5c-ui-job-libsql-build-manifest.json"
DRIVER = HERE / "p5c-ui-job-libsql-build-driver.mjs"
MANIFEST_SHA = "4ad86e83ac189da016ba255f901aeb55ed05a0078c2d49a8b3ffe77f4e7a3927"
DRIVER_SHA = "6f4b6aa0f8493ab6f5b435b69d2fd9257843056d224ee6f7d9c4680356b3abac"
GIT = "/nix/store/09lvdab6qif434wbjzz6wlcf6njp8m4h-git-2.51.2/bin/git"
GIT_DIR = "/Users/hikaru/github.com/tuanemuy/hollow/.git"
BODY = 60
TAIL = 30
MIB = 1024 * 1024

class Held(Exception):
    pass

def require(value):
    if not value:
        raise Held()

def fingerprint(s):
    return (s.st_dev, s.st_ino, s.st_mode, s.st_uid, s.st_nlink, s.st_size, s.st_mtime_ns, s.st_ctime_ns)

def stable(path, row=None, limit=32 * MIB, mode=0o600):
    path = str(path)
    s = os.lstat(path)
    require(stat.S_ISREG(s.st_mode) and s.st_uid == os.getuid() and s.st_nlink == 1)
    require(os.path.realpath(path) == path and s.st_size <= limit)
    if mode is not None:
        require(stat.S_IMODE(s.st_mode) == mode)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        a = os.fstat(fd)
        chunks = []
        count = 0
        while True:
            b = os.read(fd, 65536)
            if not b:
                break
            count += len(b)
            require(count <= limit)
            chunks.append(b)
        z = os.fstat(fd)
    finally:
        os.close(fd)
    require(fingerprint(s) == fingerprint(a) == fingerprint(z) == fingerprint(os.lstat(path)))
    b = b"".join(chunks)
    require(len(b) == s.st_size)
    if row is not None:
        require(len(b) == row["bytes"] and hashlib.sha256(b).hexdigest() == row["sha256"])
        require(stat.S_IMODE(s.st_mode) == row["mode"] and s.st_uid == row["uid"] and s.st_nlink == row["nlink"])
    return b

def exact(d, names):
    require(type(d) is dict and set(d) == set(names))

def binding():
    raw = stable(MANIFEST, limit=256 * 1024)
    require(hashlib.sha256(raw).hexdigest() == MANIFEST_SHA)
    envelope = json.loads(raw)
    exact(envelope, ("schemaVersion", "payloadBytes", "payloadSha256", "payloadZlibBase64"))
    require(envelope["schemaVersion"] == 1 and 0 < envelope["payloadBytes"] <= 2 * MIB)
    decoder = zlib.decompressobj()
    payload = decoder.decompress(base64.b64decode(envelope["payloadZlibBase64"], validate=True), 2 * MIB + 1)
    require(decoder.eof and not decoder.unused_data and not decoder.unconsumed_tail)
    require(len(payload) == envelope["payloadBytes"] and hashlib.sha256(payload).hexdigest() == envelope["payloadSha256"])
    m = json.loads(payload)
    exact(m, ("schemaVersion", "candidate", "sourceManifestSha", "source", "anchors", "sourceRoot", "root", "node", "entries", "dependencies", "links", "closurePending", "packageAliases", "edges", "reachableSource", "declarationEdges", "linkTargets", "dependencyBytes"))
    require(m["candidate"] == "79ef126edd5d3440cde20dbe8fd372e7235010c5" and m["closurePending"] is False)
    require(m["sourceRoot"] == "/Users/hikaru/github.com/tuanemuy/hollow-ui-job-source-79ef126e-jsbi4-20261006")
    require(m["root"] == "/Users/hikaru/.local/share/hollow-validation/goal-implement-ui-job-build-jsbi4-20261006-671ce834")
    require(m["node"] == "/nix/store/4366l8b6kz1f2sxq6243rfs53grc73zz-nodejs-slim-24.15.0/bin/node")
    require(m["entries"] == ["searchSupervisor", "searchQuery", "publicQuery", "noteProjection"])
    require(len(m["source"]) == 327 and sum(r["bytes"] for r in m["source"]) == 1920009)
    encoded = json.dumps(m["source"], sort_keys=True, separators=(",", ":")).encode()
    require(hashlib.sha256(encoded).hexdigest() == m["sourceManifestSha"])
    require(len(m["dependencies"]) == 708 and m["dependencyBytes"] == 14014031)
    require(len(m["packageAliases"]) == 10 and len(m["linkTargets"]) == 7)
    require(len(m["edges"]) == 788 and len(m["declarationEdges"]) == 2532 and len(m["reachableSource"]) == 66)
    names = []
    for r in m["source"]:
        exact(r, ("path", "mode", "bytes", "gitBlob", "sha256"))
        p = Path(r["path"])
        require(not p.is_absolute() and ".." not in p.parts and r["mode"] == "100644" and 0 <= r["bytes"] <= 2 * MIB)
        require(len(r["gitBlob"]) == 40 and len(r["sha256"]) == 64)
        names.append(r["path"])
    require(names == sorted(set(names)))
    driver = stable(DRIVER, limit=64 * 1024)
    require(hashlib.sha256(driver).hexdigest() == DRIVER_SHA)
    own = stable(Path(__file__).resolve(), limit=64 * 1024)
    require(len(raw) + len(driver) + len(own) + 32768 + 4096 <= 256 * 1024)
    return m

def group_absent(pid):
    try:
        os.killpg(pid, 0)
        return False
    except ProcessLookupError:
        return True
    except OSError:
        return None

def send_owned(pid, sig):
    # The original known group is checked even when its leader has exited.
    try:
        os.killpg(pid, sig)
        return "sent-success"
    except ProcessLookupError:
        return "ESRCH-absent"
    except PermissionError:
        return "EPERM-unknown"
    except OSError:
        return "other-unknown"

def source_objects(m):
    # This one immutable-object reader precedes the native build process scope.
    data = ("\n".join(r["gitBlob"] for r in m["source"]) + "\n").encode()
    env = {"PATH": "/usr/bin:/bin", "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_NO_LAZY_FETCH": "1"}
    selector = None
    output = bytearray()
    discarded_count = 0
    read_eof = [False, False]
    fd_closed = [False, False, False]
    failed = False
    forced = False
    body_complete = False
    signal_outcomes = {"TERM": "not-attempted", "KILL": "not-attempted"}
    leader_waited = False
    leader_code = None
    final_pg_absent = None
    deadline = time.monotonic() + 10
    child = subprocess.Popen([GIT, "--git-dir=" + GIT_DIR, "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, cwd="/", start_new_session=True)
    try:
        child.stdin.write(data)
        child.stdin.close()
        fd_closed[0] = child.stdin.closed
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
        leader_code = child.wait(timeout=max(0, deadline - time.monotonic()))
        leader_waited = True
        require(leader_code == 0)
        final_pg_absent = group_absent(child.pid)
        require(discarded_count == 0 and final_pg_absent is True)
        body_complete = True
    except BaseException:
        failed = True
        output.clear()
        # The original group remains owned even after its leader has exited.
        cleanup_end = time.monotonic() + 2
        def leader_done():
            try:
                return child.poll() is not None
            except BaseException:
                return False

        if not leader_done() or group_absent(child.pid) is not True:
            forced = True
            signal_outcomes["TERM"] = send_owned(child.pid, signal.SIGTERM)

        # Restore observation of only the two already-owned pipes after setup
        # failure. Failed registrations stay unobserved; no EOF is synthesized.
        if selector is not None:
            try:
                selector.close()
            except BaseException:
                pass
        selector = None
        try:
            selector = selectors.DefaultSelector()
            for index, stream in enumerate((child.stdout, child.stderr)):
                if read_eof[index] or stream.closed:
                    continue
                try:
                    os.set_blocking(stream.fileno(), False)
                    selector.register(stream.fileno(), selectors.EVENT_READ, index)
                except BaseException:
                    pass
        except BaseException:
            if selector is not None:
                try:
                    selector.close()
                except BaseException:
                    pass
            selector = None

        def drain_until(end):
            nonlocal selector
            while time.monotonic() < end:
                if leader_done() and group_absent(child.pid) is True and all(read_eof):
                    break
                if selector is None:
                    time.sleep(min(0.05, max(0, end - time.monotonic())))
                    continue
                try:
                    for key, _ in selector.select(min(0.05, max(0, end - time.monotonic()))):
                        try:
                            block = os.read(key.fd, 65536)
                        except BlockingIOError:
                            continue
                        except BaseException:
                            selector.unregister(key.fd)
                            continue
                        if not block:
                            read_eof[key.data] = True
                            selector.unregister(key.fd)
                        # Recovery bytes are discarded, never parsed or returned.
                except BaseException:
                    try:
                        selector.close()
                    except BaseException:
                        pass
                    selector = None

        drain_until(min(cleanup_end, time.monotonic() + 1))
        if not leader_done() or group_absent(child.pid) is not True:
            forced = True
            signal_outcomes["KILL"] = send_owned(child.pid, signal.SIGKILL)
        drain_until(cleanup_end)
        try:
            leader_code = child.wait(timeout=max(0, cleanup_end - time.monotonic()))
            leader_waited = True
        except BaseException:
            leader_code = None
            leader_waited = False
        final_pg_absent = group_absent(child.pid)
    finally:
        if selector is not None:
            try:
                selector.close()
            except BaseException:
                failed = True
        for index, stream in enumerate((child.stdin, child.stdout, child.stderr)):
            if stream is not None:
                try:
                    if failed and index == 0 and not stream.closed:
                        os.set_blocking(stream.fileno(), False)
                    stream.close()
                    fd_closed[index] = stream.closed
                except BaseException:
                    fd_closed[index] = False
    require(body_complete and not failed and not forced)
    require(leader_waited and leader_code == 0 and final_pg_absent is True)
    require(all(read_eof) and all(fd_closed) and discarded_count == 0)
    output = bytes(output)
    cursor = 0
    found = []
    for r in m["source"]:
        end = output.find(b"\n", cursor)
        require(end >= cursor)
        require(output[cursor:end] == (r["gitBlob"] + " blob " + str(r["bytes"])).encode())
        cursor = end + 1
        b = output[cursor:cursor + r["bytes"]]
        cursor += r["bytes"]
        require(output[cursor:cursor + 1] == b"\n")
        cursor += 1
        require(hashlib.sha256(b).hexdigest() == r["sha256"])
        require(hashlib.sha1(b"blob " + str(len(b)).encode() + b"\0" + b).hexdigest() == r["gitBlob"])
        found.append(b)
    require(cursor == len(output))
    return found

def preflight():
    m = binding()
    for r in m["dependencies"]:
        exact(r, ("canonical", "mode", "uid", "nlink", "bytes", "sha256"))
        require(r["canonical"].startswith("/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/"))
        stable(r["canonical"], r, limit=16 * MIB, mode=None)
    for a in m["packageAliases"]:
        exact(a, ("alias", "canonical"))
        require(a["alias"].startswith("/Users/hikaru/github.com/tuanemuy/hollow/") and os.path.realpath(a["alias"]) == a["canonical"])
    node = os.lstat(m["node"])
    require(stat.S_ISREG(node.st_mode) and stat.S_IMODE(node.st_mode) == 0o555 and node.st_uid == 0 and node.st_nlink == 2 and node.st_size == 64896912)
    require(os.path.realpath(m["node"]) == m["node"])
    git = os.lstat(GIT)
    require(stat.S_ISREG(git.st_mode) and stat.S_IMODE(git.st_mode) == 0o555 and git.st_uid == 0 and git.st_nlink == 3 and git.st_size == 3989984 and os.path.realpath(GIT) == GIT)
    source = source_objects(m)
    return m, source

def wx(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    inode = None
    try:
        inode = (os.fstat(fd).st_dev, os.fstat(fd).st_ino)
        cursor = 0
        while cursor < len(data):
            cursor += os.write(fd, data[cursor:])
        os.fsync(fd)
    finally:
        os.close(fd)
    after = os.lstat(path)
    require((after.st_dev, after.st_ino) == inode)
    require(stable(path, limit=max(4096, len(data))) == data)

def own_dirs(path, anchor):
    path = Path(path)
    relative = path.relative_to(anchor)
    current = Path(anchor)
    for part in relative.parts:
        current = current / part
        if not current.exists():
            os.mkdir(current, 0o700)
        s = os.lstat(current)
        require(stat.S_ISDIR(s.st_mode) and not stat.S_ISLNK(s.st_mode) and s.st_uid == os.getuid() and stat.S_IMODE(s.st_mode) == 0o700)

def materialize(m, source):
    os.umask(0o077)
    sroot = Path(m["sourceRoot"])
    root = Path(m["root"])
    tmp = Path(str(root) + "-toolTMP")
    for p in (sroot, root, tmp):
        require(not os.path.lexists(p))
    for p in (sroot, root, tmp):
        os.mkdir(p, 0o700)
    for r, b in zip(m["source"], source):
        p = sroot / r["path"]
        own_dirs(p.parent, sroot)
        wx(p, b)
    for relative, target in sorted(m["linkTargets"].items()):
        p = sroot / relative
        own_dirs(p.parent, sroot)
        os.symlink(target, p)
        require(os.path.realpath(p) == target)
    own_dirs(root / "outputs/browse", root)
    return sroot, root, tmp

def capacity(m):
    total = 0
    count = 0
    expected_links = {str(Path(m["sourceRoot"]) / a): t for a, t in m["linkTargets"].items()}
    output_files = {str(Path(m["root"]) / "outputs/browse" / (name + ".mjs")) for name in m["entries"]}
    output_dirs = {str(Path(m["root"]) / "outputs"), str(Path(m["root"]) / "outputs/browse")}

    for domain, limit in [(m["sourceRoot"], 32 * MIB), (m["root"], 192 * MIB), (m["root"] + "-toolTMP", 8 * MIB), (m["root"] + "/outputs", 16 * MIB)]:
        subtotal = 0
        for parent, dirs, files in os.walk(domain, followlinks=False):
            for name in dirs + files:
                p = os.path.join(parent, name)
                s = os.lstat(p)
                count += 1
                if p.startswith(m["root"] + "/outputs/"):
                    require(p in output_files or p in output_dirs)
                require(count <= 4096 and s.st_uid == os.getuid())
                if stat.S_ISLNK(s.st_mode):
                    require(p in expected_links and os.readlink(p) == expected_links[p])
                    continue
                if stat.S_ISDIR(s.st_mode):
                    require(stat.S_IMODE(s.st_mode) == 0o700)
                    continue
                require(stat.S_ISREG(s.st_mode) and s.st_nlink == 1 and stat.S_IMODE(s.st_mode) == 0o600)
                subtotal += s.st_size
        require(subtotal <= limit)
        if not domain.endswith("/outputs"):
            total += subtotal
    require(total <= 192 * MIB)

def decode_frame(line, frames, node_pid):
    require(len(line) <= 512 and len(frames) < 16)
    f = json.loads(line)
    event = f.get("event") if type(f) is dict else None
    if event == "header":
        exact(f, ("event", "schemaVersion", "entries", "nativeWorkers", "database"))
        require(f == {"event": "header", "schemaVersion": 1, "entries": 4, "nativeWorkers": 0, "database": False} and not frames)
    elif event == "service":
        exact(f, ("event", "registered", "count", "stderr", "observation", "ownedPid"))
        require(type(f["ownedPid"]) is int and f["ownedPid"] > 1)
        require(os.getpgid(f["ownedPid"]) == node_pid)
        f.pop("ownedPid")
        require(f == {"event": "service", "registered": True, "count": 1, "stderr": None, "observation": "after-start"})
        f["actualOwnedPGMatch"] = True
        require([x["event"] for x in frames] == ["header"])
    elif event == "built":
        exact(f, ("event", "entries", "inputs", "warnings"))
        require(f["entries"] == 4 and type(f["inputs"]) is int and 0 < f["inputs"] <= 1034 and f["warnings"] == 0)
        require([x["event"] for x in frames] == ["header", "service"])
    elif event == "closed":
        exact(f, ("event", "buildDone", "serviceCount", "exit", "signal", "close", "stdoutEnd", "stdoutClose", "stdinFinish", "stdinClose", "stderr", "stdinEndCalls", "originalStopCalled", "rootForce", "nativeWorkers"))
        require([x["event"] for x in frames] == ["header", "service", "built"])
        require(f["serviceCount"] == f["stdinEndCalls"] == 1 and f["exit"] == f["nativeWorkers"] == 0 and f["signal"] is None and f["stderr"] is None and f["rootForce"] is False)
        require(all(f[k] is True for k in ("buildDone", "close", "stdoutEnd", "stdoutClose", "stdinFinish", "stdinClose", "originalStopCalled")))
    elif event == "held":
        exact(f, ("event", "kind", "phase", "reason"))
        require(f["kind"] == "UNKNOWN")
        require(f["phase"] is None or (type(f["phase"]) is str and f["phase"] in ('SETUP', 'IMPORT_PENDING', 'IMPORT_RETURNED', 'BUILD_PENDING', 'BUILD_RETURNED', 'INPUT_CHECK', 'OUTPUT_CHECK', 'BUILT_FRAME', 'STDIN_END', 'SERVICE_CLOSE', 'ORIGINAL_STOP', 'CLOSED_FRAME')))
        require(f["reason"] is None or (type(f["reason"]) is str and f["reason"] in ('UNKNOWN', 'SPAWN_BINDING', 'EXTRA_CHILD', 'CHILD_ERROR', 'SERVICE_REGISTRATION', 'STDIN_ERROR', 'STDOUT_ERROR', 'WORKER_OBSERVED', 'REMOTE_SOCKET', 'RESOLVE_SCOPE', 'LOAD_SCOPE', 'PORT_DENIED', 'DEADLINE', 'BUILD_HELD', 'BUILD_RESULT', 'INPUT_SCOPE', 'OUTPUT_SET', 'CLOSURE_HELD', 'CLOSURE_RESULT', 'FRAME_LIMIT', 'FRAME_WRITE')))
    else:
        raise Held()
    frames.append(f)

def monitor(m, root, tmp):
    control_r, control_w = os.pipe()
    child = None
    selector = None
    frames = []
    buffer = b""
    discarded = [0, 0]
    eof = [False, False, False]
    fd_closed = [False, False, False, False]
    forced = False
    fault = False
    signals = {"TERM": "not-attempted", "KILL": "not-attempted"}
    started = time.monotonic()
    term_at = kill_at = None
    env = {"PATH": str(Path(m["node"]).parent) + ":/usr/bin:/bin", "TMPDIR": str(tmp), "HOME": str(tmp), "HOLLOW_BUILD_CONTROL": str(control_w)}
    try:
        child = subprocess.Popen([m["node"], str(DRIVER)], cwd=str(Path(m["sourceRoot"]) / "apps/web"), env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, pass_fds=(control_w,), start_new_session=True)
        # Cleanup owns the original PID/PG immediately, before selector setup.
        os.close(control_w)
        fd_closed[3] = True
        control_w = None
        selector = selectors.DefaultSelector()
        for index, stream in enumerate((child.stdout, child.stderr, control_r)):
            fd = stream if type(stream) is int else stream.fileno()
            os.set_blocking(fd, False)
            selector.register(fd, selectors.EVENT_READ, index)
        next_guard = started
        while True:
            now = time.monotonic()
            if now >= next_guard and not fault:
                capacity(m)
                next_guard = now + 0.2
            if (fault or now - started >= BODY or (child.poll() is not None and not group_absent(child.pid))) and term_at is None:
                forced = True
                term_at = now
                signals["TERM"] = send_owned(child.pid, signal.SIGTERM)
            if term_at is not None and now - term_at >= 10 and kill_at is None and group_absent(child.pid) is not True:
                kill_at = now
                signals["KILL"] = send_owned(child.pid, signal.SIGKILL)
            if now - started >= BODY + TAIL or (term_at is not None and now - term_at >= TAIL):
                fault = True
                break
            for key, _ in selector.select(0.05):
                index = key.data
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    eof[index] = True
                    selector.unregister(key.fd)
                    continue
                if index < 2:
                    discarded[index] += len(chunk)
                    if sum(discarded) > 2 * MIB:
                        fault = True
                else:
                    buffer += chunk
                    if len(buffer) > 32768:
                        raise Held()
                    while b"\n" in buffer:
                        line, buffer = buffer.split(b"\n", 1)
                        decode_frame(line + b"\n", frames, child.pid)
                        if frames[-1]["event"] == "held":
                            fault = True
            if child.poll() is not None and all(eof):
                break
    except BaseException:
        fault = True
    finally:
        if child is not None and (child.poll() is None or group_absent(child.pid) is not True):
            forced = True
            if signals["TERM"] == "not-attempted":
                signals["TERM"] = send_owned(child.pid, signal.SIGTERM)
            end = min(started + BODY + TAIL, time.monotonic() + 10)
            while time.monotonic() < end and group_absent(child.pid) is not True:
                time.sleep(0.05)
            if group_absent(child.pid) is not True:
                signals["KILL"] = send_owned(child.pid, signal.SIGKILL)
            end = min(started + BODY + TAIL, time.monotonic() + 10)
            while time.monotonic() < end and child.poll() is None:
                time.sleep(0.05)
        if selector is not None and child is not None and not all(eof):
            drain_end = min(started + BODY + TAIL, time.monotonic() + 10)
            while time.monotonic() < drain_end and not all(eof):
                try:
                    for key, _ in selector.select(0.05):
                        chunk = os.read(key.fd, 65536)
                        if not chunk:
                            eof[key.data] = True
                            selector.unregister(key.fd)
                        elif key.data < 2:
                            discarded[key.data] += len(chunk)
                        else:
                            # Failed frames remain untrusted and are discarded.
                            fault = True
                except OSError:
                    fault = True
                    break
        if child is not None:
            try:
                child.wait(timeout=max(0, min(1, started + BODY + TAIL - time.monotonic())))
            except subprocess.TimeoutExpired:
                fault = True
            for index, stream in enumerate((child.stdout, child.stderr)):
                if stream is not None:
                    stream.close()
                    fd_closed[index] = stream.closed
        if selector is not None:
            selector.close()
        os.close(control_r)
        fd_closed[2] = True
        if control_w is not None:
            os.close(control_w)
            fd_closed[3] = True
    absent = group_absent(child.pid) if child is not None else None
    normal = not fault and not forced and child is not None and child.returncode == 0 and absent is True and all(eof) and all(fd_closed) and not buffer and [f["event"] for f in frames] == ["header", "service", "built", "closed"]
    safe = {"schemaVersion": 1, "executed": True, "normal": normal, "held": not normal, "nodeExit": child.returncode if child is not None else None, "knownPGAbsent": absent, "pipeEOF": eof[:2], "controlEOF": eof[2], "fdClosed": fd_closed, "force": forced, "signals": signals, "rawDiscardBytes": discarded, "frames": frames, "databaseAudit": False}
    return normal, safe

def main():
    require(sys.argv[1:] in ([], ["--run"]))
    m, source = preflight()
    if not sys.argv[1:]:
        print(json.dumps({"schemaVersion": 1, "preflight": True, "executed": False, "rootProbed": False, "sourceCreated": False, "database": False, "sourceFiles": 327, "sourceBytes": 1920009, "dependencyFiles": 708, "dependencyBytes": 14014031, "entries": 4}, separators=(",", ":")))
        return
    _, root, tmp = materialize(m, source)
    normal, safe = monitor(m, root, tmp)
    if normal:
        capacity(m)
        records = []
        total = 0
        for name in m["entries"]:
            p = root / "outputs/browse" / (name + ".mjs")
            data = stable(p, limit=16 * MIB)
            total += len(data)
            require(total <= 16 * MIB)
            records.append({"name": name + ".mjs", "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        manifest = {"schemaVersion": 1, "candidate": m["candidate"], "sourceManifestSha": m["sourceManifestSha"], "buildDriverSha": DRIVER_SHA, "files": records, "bytes": total}
        body = (json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n").encode()
        require(len(body) <= 4096)
        wx(root / "browse-build-manifest.json", body)
        safe["outputFiles"] = 4
        safe["outputBytes"] = total
        safe["outputManifestSha"] = hashlib.sha256(body).hexdigest()
    print(json.dumps(safe, separators=(",", ":")))
    if not normal:
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except BaseException:
        print('{"schemaVersion":1,"normal":false,"held":true,"kind":"UNKNOWN","databaseAudit":false}')
        sys.exit(1)
