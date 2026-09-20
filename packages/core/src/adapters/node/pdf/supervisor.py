"""Supervise one isolated PDF engine without adopting unknown processes."""

from __future__ import annotations

import fcntl
import json
import os
import re
import selectors
import signal
import stat
import subprocess
import sys
import time


MAX_SAFE_INTEGER = 9007199254740991
LINE_BYTES = 65536
STAGES = frozenset(
    ("browser-ready", "document-ready", "rendered", "channel-closing")
)
RENDER_CODES = frozenset(
    (
        "ok",
        "cancelled",
        "deadline",
        "resource-limit",
        "invalid-input",
        "render-failed",
        "close-unproven",
        "identifier",
    )
)
UUID = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\Z"
)
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
MISSING = object()


class Rejected(Exception):
    def __init__(self, code, reason):
        super().__init__(reason)
        self.code = code
        self.reason = reason


def integer(value, minimum=0, maximum=MAX_SAFE_INTEGER):
    return type(value) is int and minimum <= value <= maximum


def exact(value, fields):
    return type(value) is dict and value.keys() == set(fields)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate-field")
        result[key] = value
    return result


def invalid_number(_):
    raise ValueError("invalid-number")


def parse_json(data):
    return json.loads(
        data.decode("utf-8", "strict"),
        object_pairs_hook=unique_object,
        parse_constant=invalid_number,
    )


def private_info(fd, directory=False, mode=0o600):
    info = os.fstat(fd)
    valid_kind = stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)
    if (
        not valid_kind
        or info.st_uid != os.getuid()
        or stat.S_IMODE(info.st_mode) != (0o700 if directory else mode)
        or (not directory and info.st_nlink != 1)
    ):
        raise Rejected(78, "invalid-ownership")
    return info


def open_directory(path, parent=None):
    fd = os.open(
        path,
        os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC,
        dir_fd=parent,
    )
    try:
        private_info(fd, True)
        return fd
    except BaseException:
        os.close(fd)
        raise


def open_file(name, parent, create=False, mode=0o600):
    flags = os.O_RDWR if create else os.O_RDONLY
    if create:
        flags |= os.O_CREAT
    fd = os.open(
        name,
        flags | os.O_NOFOLLOW | os.O_NONBLOCK | os.O_CLOEXEC,
        0o600,
        dir_fd=parent,
    )
    try:
        private_info(fd, mode=mode)
        return fd
    except BaseException:
        os.close(fd)
        raise


def read_json_file(name, parent, limit, optional=False):
    try:
        fd = open_file(name, parent)
    except FileNotFoundError:
        if optional:
            return MISSING
        raise
    try:
        before = private_info(fd)
        if before.st_size > limit:
            raise Rejected(78, "invalid-file-size")
        data = bytearray()
        while len(data) <= limit:
            part = os.read(fd, min(65536, limit + 1 - len(data)))
            if not part:
                break
            data.extend(part)
        after = private_info(fd)
        if len(data) > limit or len(data) != after.st_size or (
            before.st_size, before.st_mtime_ns, before.st_ctime_ns
        ) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            raise Rejected(78, "changed-input")
        return parse_json(data)
    finally:
        os.close(fd)


def configuration(root):
    value = read_json_file("runtime.json", root, 16384)
    if type(value) is not dict:
        raise Rejected(78, "invalid-config")
    for field in ("node", "engine"):
        path = value.get(field)
        if (
            type(path) is not str
            or not os.path.isabs(path)
            or any(char in path for char in ("\0", "\r", "\n"))
            or not stat.S_ISREG(os.stat(path).st_mode)
        ):
            raise Rejected(78, "invalid-config")
    if not os.access(value["node"], os.X_OK):
        raise Rejected(78, "invalid-config")
    return value


def workspace(root, identifier):
    if not UUID.fullmatch(identifier):
        raise Rejected(78, "invalid-workspace")
    workspaces = open_directory("workspaces", root)
    try:
        directory = open_directory(identifier, workspaces)
    finally:
        os.close(workspaces)
    try:
        native = open_directory("native", directory)
        os.close(native)
        for name in ("manifest.json", "admission.json", "resources.pack"):
            fd = open_file(name, directory, mode=0o400 if name == "resources.pack" else 0o600)
            os.close(fd)
        for name in ("output.partial.pdf", "output.pdf"):
            try:
                fd = open_file(name, directory)
            except FileNotFoundError:
                continue
            os.close(fd)
    finally:
        os.close(directory)


def render_event(value):
    if exact(value, ("event", "name")) and value["event"] == "stage":
        if type(value["name"]) is str and value["name"] in STAGES:
            return value
        raise ValueError("invalid-stage")
    fields = (
        "event", "ok", "code", "bytes", "sha256", "chromeClosed",
        "channelClosed", "sinkClosed", "protocolClosed",
    )
    if not exact(value, fields) or value["event"] != "render-closed":
        raise ValueError("invalid-event")
    if (
        type(value["ok"]) is not bool
        or type(value["code"]) is not str
        or value["code"] not in RENDER_CODES
        or not integer(value["bytes"])
        or any(type(value[field]) is not bool for field in fields[-4:])
        or not (
            value["sha256"] is None
            or type(value["sha256"]) is str and SHA256.fullmatch(value["sha256"])
        )
    ):
        raise ValueError("invalid-result")
    if value["ok"] != (value["code"] == "ok"):
        raise ValueError("inconsistent-result")
    if value["ok"] and (
        value["sha256"] is None or not all(value[field] for field in fields[-4:])
    ):
        raise ValueError("unclosed-success")
    return value


class Protocol:
    def __init__(self, publish):
        self.pending = bytearray()
        self.failed = False
        self.result = None
        self.stages = set()
        self.publish = publish

    def feed(self, chunk):
        if self.failed:
            return
        self.pending.extend(chunk)
        while b"\n" in self.pending:
            line, _, remainder = self.pending.partition(b"\n")
            self.pending = bytearray(remainder)
            if len(line) > LINE_BYTES or self.result is not None:
                self.failed = True
                self.pending.clear()
                return
            try:
                event = render_event(parse_json(line))
            except (ValueError, UnicodeError, RecursionError, OverflowError):
                self.failed = True
                self.pending.clear()
                return
            if event["event"] == "render-closed":
                self.result = event
                self.publish(event)
            elif event["name"] not in self.stages:
                self.stages.add(event["name"])
                self.publish(event)
        if len(self.pending) > LINE_BYTES:
            self.failed = True
            self.pending.clear()

    def finish(self):
        if self.pending or self.result is None:
            self.failed = True
        self.pending.clear()


def ledger(value):
    if not exact(value, ("version", "generation", "group", "workspace", "closed", "owner")):
        raise Rejected(78, "invalid-ledger")
    if (
        type(value["version"]) is not int
        or value["version"] != 1
        or not integer(value["generation"], 1)
        or not integer(value["group"], 2)
        or type(value["workspace"]) is not str
        or not UUID.fullmatch(value["workspace"])
        or type(value["closed"]) is not bool
    ):
        raise Rejected(78, "invalid-ledger")
    owner = value["owner"]
    if (
        not exact(owner, ("kind", "supervisor", "child", "session", "spawnMonotonicNs"))
        or owner["kind"] != "unreaped-child-v1"
        or not integer(owner["supervisor"], 2)
        or type(owner["child"]) is not int
        or owner["child"] != value["group"]
        or type(owner["session"]) is not int
        or owner["session"] != value["group"]
        or type(owner["spawnMonotonicNs"]) is not str
        or not re.fullmatch(r"[1-9][0-9]{0,29}", owner["spawnMonotonicNs"])
    ):
        raise Rejected(78, "invalid-ledger")
    return value


def write_ledger(root, value):
    ledger(value)
    data = json.dumps(value, separators=(",", ":"), allow_nan=False).encode("ascii")
    fd = open_file("generation.json", root, True)
    try:
        os.ftruncate(fd, 0)
        position = 0
        while position < len(data):
            count = os.write(fd, data[position:])
            if count <= 0:
                raise OSError("ledger-write")
            position += count
        os.fsync(fd)
    finally:
        os.close(fd)
    os.fsync(root)


def process_table():
    try:
        probe = subprocess.Popen(
            ["/bin/ps", "-axo", "pid=,ppid=,pgid=,stat="],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            env={"PATH": "/usr/bin:/bin", "LANG": "C"},
            close_fds=True,
        )
    except OSError as error:
        raise Rejected(77, "ownership-unproven") from error
    output = bytearray()
    selector = selectors.DefaultSelector()
    try:
        os.set_blocking(probe.stdout.fileno(), False)
        selector.register(probe.stdout, selectors.EVENT_READ)
        until = time.monotonic() + 2
        while selector.get_map():
            if time.monotonic() >= until:
                raise Rejected(77, "ownership-unproven")
            for key, _ in selector.select(min(0.05, max(0, until - time.monotonic()))):
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    selector.unregister(key.fileobj)
                else:
                    output.extend(chunk)
                    if len(output) > 8 * 1024 * 1024:
                        raise Rejected(77, "ownership-unproven")
        if probe.wait(timeout=max(0.01, until - time.monotonic())) != 0:
            raise Rejected(77, "ownership-unproven")
        rows = {}
        for line in output.decode("ascii", "strict").splitlines():
            fields = line.split()
            if len(fields) != 4 or not all(part.isdecimal() for part in fields[:3]):
                raise Rejected(77, "ownership-unproven")
            pid, parent, group = map(int, fields[:3])
            if pid in rows or not integer(pid, 1) or not integer(parent) or not integer(group):
                raise Rejected(77, "ownership-unproven")
            rows[pid] = (parent, group, fields[3])
        if os.getpid() not in rows:
            raise Rejected(77, "ownership-unproven")
        return rows
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        raise Rejected(77, "ownership-unproven") from error
    finally:
        selector.close()
        if probe.poll() is None:
            probe.kill()
            probe.wait()
        probe.stdout.close()


def previous_generation(root):
    value = read_json_file("generation.json", root, 65536, True)
    if value is MISSING:
        return 0
    try:
        previous = ledger(value)
    except Rejected:
        if type(value) is dict and integer(value.get("group"), 2):
            if any(row[1] == value["group"] for row in process_table().values()):
                raise Rejected(77, "ownership-unproven") from None
        raise
    if any(row[1] == previous["group"] for row in process_table().values()):
        raise Rejected(76, "old-group-alive")
    return previous["generation"]


class ChildPin:
    """WNOWAIT keeps the group leader PID unavailable for reuse until closure."""

    def __init__(self, child):
        self.child = child
        self.reaped = False
        self.exit = None
        self.observed_descendants = set()
        self.session_proved = False

    def observe_exit(self):
        if self.reaped:
            raise Rejected(77, "ownership-unproven")
        try:
            result = os.waitid(
                os.P_PID,
                self.child.pid,
                os.WEXITED | os.WNOHANG | os.WNOWAIT,
            )
        except (ChildProcessError, OSError) as error:
            raise Rejected(77, "ownership-unproven") from error
        if result is not None:
            if result.si_pid != self.child.pid:
                raise Rejected(77, "ownership-unproven")
            if result.si_code == os.CLD_EXITED:
                self.exit = result.si_status
            elif result.si_code in (os.CLD_KILLED, os.CLD_DUMPED):
                self.exit = -result.si_status
            else:
                raise Rejected(77, "ownership-unproven")
        return self.exit

    def prove(self):
        self.observe_exit()
        if self.exit is not None:
            if not self.session_proved:
                raise Rejected(77, "ownership-unproven")
            return
        try:
            if os.getpgid(self.child.pid) != self.child.pid or os.getsid(self.child.pid) != self.child.pid:
                raise Rejected(77, "ownership-unproven")
            self.session_proved = True
        except OSError as error:
            if error.errno == 3 and self.session_proved:
                self.observe_exit()
                if self.exit is not None:
                    return
            raise Rejected(77, "ownership-unproven") from error

    def inspect(self):
        self.prove()
        rows = process_table()
        leader = rows.get(self.child.pid)
        if leader is None or leader[0] != os.getpid() or leader[1] != self.child.pid:
            raise Rejected(77, "ownership-unproven")
        if self.exit is not None and "Z" not in leader[2]:
            raise Rejected(77, "ownership-unproven")
        family = {self.child.pid}
        while True:
            added = {pid for pid, row in rows.items() if row[0] in family} - family
            if not added:
                break
            family.update(added)
        self.observed_descendants.update(family - {self.child.pid})
        members = {pid for pid, row in rows.items() if row[1] == self.child.pid}
        escaped = {pid for pid in self.observed_descendants if pid in rows and pid not in members}
        self.prove()
        return members - {self.child.pid}, escaped

    def terminate(self, force=False):
        self.prove()
        try:
            if force:
                os.killpg(self.child.pid, signal.SIGKILL)
            elif self.exit is None:
                os.kill(self.child.pid, signal.SIGTERM)
        except ProcessLookupError as error:
            raise Rejected(77, "ownership-unproven") from error

    def reap(self):
        if self.observe_exit() is None:
            raise Rejected(77, "close-unproven")
        result = self.child.wait(timeout=1)
        self.reaped = True
        if result != self.exit:
            raise Rejected(77, "ownership-unproven")
        return result


class Output:
    def __init__(self):
        self.broken = False

    def emit(self, value):
        if self.broken:
            return
        try:
            data = (json.dumps(value, separators=(",", ":"), allow_nan=False) + "\n").encode("ascii")
            position = 0
            while position < len(data):
                position += os.write(sys.stdout.fileno(), data[position:])
        except (BrokenPipeError, OSError):
            self.broken = True


def run_engine(root_path, root, config, identifier, generation, lock, deadline, grace, started, output):
    child = None
    pin = None
    state = None
    selector = selectors.DefaultSelector()
    protocol = Protocol(output.emit)
    stderr_bytes = 0
    reason = None
    stopping = None
    killed = None
    leader_finished = None
    closed = False
    signal_cancelled = False
    control = bytearray()
    streams = set()
    previous_handlers = {}

    def cancel_signal(_number, _frame):
        nonlocal signal_cancelled
        signal_cancelled = True

    def stop(why):
        nonlocal reason, stopping
        reason = reason or why
        if stopping is None:
            stopping = time.monotonic()
            pin.terminate()

    def drain(timeout):
        nonlocal stderr_bytes, reason
        for key, _ in selector.select(timeout):
            try:
                chunk = os.read(key.fd, 65536 if key.data != "parent" else 128)
            except BlockingIOError:
                continue
            if not chunk:
                selector.unregister(key.fileobj)
                if key.data == "parent":
                    reason = reason or "parent-eof"
                else:
                    streams.discard(key.data)
                    if key.data == "output":
                        protocol.finish()
                continue
            if key.data == "error":
                stderr_bytes = min(MAX_SAFE_INTEGER, stderr_bytes + len(chunk))
            elif key.data == "output":
                protocol.feed(chunk)
            else:
                control.extend(chunk)
                if control == b"cancel\n":
                    reason = reason or "cancelled"
                    selector.unregister(key.fileobj)
                    control.clear()
                elif len(control) >= 128 or b"\n" in control:
                    reason = reason or "invalid-parent"
                    selector.unregister(key.fileobj)
                    control.clear()

    def finish_child():
        until = time.monotonic() + 2
        while streams and time.monotonic() < until:
            drain(0.05)
        protocol.finish()
        if streams:
            raise Rejected(77, "close-unproven")
        members, escaped = pin.inspect()
        if escaped:
            raise Rejected(77, "ownership-unproven")
        if members:
            return False
        pin.reap()
        return True

    try:
        for number in (signal.SIGTERM, signal.SIGINT):
            previous_handlers[number] = signal.signal(number, cancel_signal)
        if (time.monotonic() - started) * 1000 >= deadline:
            raise Rejected(1, "deadline")
        child = subprocess.Popen(
            [config["node"], "--max-old-space-size=256", config["engine"], root_path, identifier, str(lock)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
            cwd=root_path,
            pass_fds=(lock,),
            close_fds=True,
            env={
                "PATH": "/usr/bin:/bin",
                "TMPDIR": os.path.join(root_path, "workspaces", identifier, "native"),
                "LANG": "ja_JP.UTF-8",
            },
        )
        pin = ChildPin(child)
        pin.prove()
        state = {
            "version": 1,
            "generation": generation,
            "group": child.pid,
            "workspace": identifier,
            "closed": False,
            "owner": {
                "kind": "unreaped-child-v1",
                "supervisor": os.getpid(),
                "child": child.pid,
                "session": child.pid,
                "spawnMonotonicNs": str(time.monotonic_ns()),
            },
        }
        write_ledger(root, state)
        output.emit({"event": "spawn", "group": child.pid, "generation": generation})
        for pipe, role in ((child.stdout, "output"), (child.stderr, "error")):
            os.set_blocking(pipe.fileno(), False)
            selector.register(pipe, selectors.EVENT_READ, role)
            streams.add(role)
        selector.register(sys.stdin, selectors.EVENT_READ, "parent")
        drain(0)
        if (time.monotonic() - started) * 1000 >= deadline:
            stop("deadline")
        elif signal_cancelled or output.broken:
            stop("cancelled")
        elif reason is not None:
            stop(reason)
        else:
            child.stdin.write(b"go\n")
            child.stdin.flush()
        while True:
            drain(0.05)
            now = time.monotonic()
            if signal_cancelled or output.broken:
                reason = reason or "cancelled"
            if protocol.failed:
                reason = reason or "invalid-protocol"
            if (now - started) * 1000 >= deadline:
                reason = reason or "deadline"
            members, escaped = pin.inspect()
            if pin.exit is not None and leader_finished is None:
                leader_finished = time.monotonic()
            if pin.exit is not None and not members and not escaped:
                if finish_child():
                    closed = True
                    break
            if escaped:
                reason = reason or "ownership-unproven"
            if leader_finished is not None and (now - leader_finished) * 1000 >= grace:
                reason = reason or "close-unproven"
            if reason:
                stop(reason)
            if stopping is not None and killed is None and (now - stopping) * 1000 >= grace:
                pin.terminate(True)
                killed = time.monotonic()
            if killed is not None and time.monotonic() - killed >= 5:
                raise Rejected(77, "close-unproven")
        if signal_cancelled or output.broken:
            reason = reason or "cancelled"
        if (time.monotonic() - started) * 1000 >= deadline:
            reason = reason or "deadline"
        success = (
            reason is None
            and not protocol.failed
            and protocol.result is not None
            and protocol.result["ok"]
            and pin.exit == 0
        )
        if not success:
            reason = reason or ("invalid-protocol" if protocol.failed else "render-failed")
        state["closed"] = True
        write_ledger(root, state)
        return 0 if success else 1, "completed" if success else reason, pin.exit, child.pid
    except BaseException as error:
        reason = error.reason if isinstance(error, Rejected) else "supervisor-failed"
        code = error.code if isinstance(error, Rejected) else 78 if child is None else 77
        if child is not None and pin is not None and not pin.reaped:
            try:
                if stopping is None:
                    stopping = time.monotonic()
                    pin.terminate()
                until = stopping + grace / 1000
                while time.monotonic() < until:
                    drain(0.05)
                    members, escaped = pin.inspect()
                    if pin.exit is not None and not members and not escaped:
                        break
                members, escaped = pin.inspect()
                if killed is None and (pin.exit is None or members):
                    pin.terminate(True)
                    killed = time.monotonic()
                until = (killed if killed is not None else time.monotonic()) + 5
                while time.monotonic() < until:
                    drain(0.05)
                    members, escaped = pin.inspect()
                    if pin.exit is not None and not members and not escaped:
                        if finish_child():
                            closed = True
                            break
                if closed and state is not None:
                    state["closed"] = True
                    write_ledger(root, state)
                if closed:
                    code = 1 if code == 77 else code
            except BaseException:
                closed = False
            if not closed:
                code = 77
        elif child is None:
            closed = True
        return code, reason, pin.exit if pin is not None else None, child.pid if child is not None else None
    finally:
        selector.close()
        if child is not None:
            for pipe in (child.stdin, child.stdout, child.stderr):
                try:
                    pipe.close()
                except OSError:
                    pass
        for number, handler in previous_handlers.items():
            signal.signal(number, handler)
        output.emit({
            "event": "supervisor-closed",
            "closed": closed,
            "reason": "completed" if closed and reason is None else reason or "close-unproven",
            "exit": pin.exit if pin is not None else None,
            "group": child.pid if child is not None else None,
            "generation": generation if child is not None else None,
            "elapsedMs": min(MAX_SAFE_INTEGER, max(0, round((time.monotonic() - started) * 1000))),
            "stderrBytes": stderr_bytes,
        })


def main():
    started = time.monotonic()
    output = Output()
    root = None
    lock = None
    code = 78
    reason = "invalid-arguments"
    try:
        os.umask(0o077)
        args = sys.argv[1:]
        if len(args) not in (2, 5) or args[0] not in ("check", "run"):
            raise Rejected(78, reason)
        mode, root_path = args[:2]
        if len(args) != (2 if mode == "check" else 5):
            raise Rejected(78, reason)
        if not os.path.isabs(root_path) or os.path.realpath(root_path) != os.path.abspath(root_path):
            raise Rejected(78, "invalid-root")
        for name in ("waitid", "P_PID", "WEXITED", "WNOHANG", "WNOWAIT"):
            if not hasattr(os, name):
                raise Rejected(78, "ownership-api-unavailable")
        root_path = os.path.abspath(root_path)
        root = open_directory(root_path)
        config = configuration(root)
        lock = open_file("generation.lock", root, True)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise Rejected(75, "active-lock") from error
        previous = previous_generation(root)
        if mode == "check":
            output.emit({"event": "checked", "closed": True})
            return 0
        identifier, deadline_text, grace_text = args[2:]
        if not re.fullmatch(r"[1-9][0-9]{0,6}", deadline_text) or not re.fullmatch(r"[1-9][0-9]{0,4}", grace_text):
            raise Rejected(78, "invalid-arguments")
        deadline, grace = int(deadline_text), int(grace_text)
        if not integer(deadline, 1, 3600000) or not integer(grace, 1, 30000):
            raise Rejected(78, "invalid-arguments")
        if previous == MAX_SAFE_INTEGER:
            raise Rejected(78, "generation-exhausted")
        workspace(root, identifier)
        code, _, _, _ = run_engine(
            root_path, root, config, identifier, previous + 1, lock,
            deadline, grace, started, output,
        )
        return code
    except Rejected as error:
        code, reason = error.code, error.reason
    except BaseException:
        code, reason = 78, "invalid-config"
    finally:
        if lock is not None:
            os.close(lock)
        if root is not None:
            os.close(root)
    output.emit({
        "event": "supervisor-closed",
        "closed": False,
        "reason": reason,
        "exit": None,
        "group": None,
        "generation": None,
        "elapsedMs": min(MAX_SAFE_INTEGER, max(0, round((time.monotonic() - started) * 1000))),
        "stderrBytes": 0,
    })
    return code


if __name__ == "__main__":
    sys.exit(main())
