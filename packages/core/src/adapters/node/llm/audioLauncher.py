"""Acquire one registered native birth before replacing this PID with the tool."""

import os
import resource
import ctypes
import errno
import json
import selectors
import signal
import stat
import sys
import time


MEMORY = 512 * 1024 * 1024
PCM_BYTES = 2 * 1024 * 1024 * 1024


def reject():
    os._exit(78)


def limits():
    os.umask(0o077)
    resource.setrlimit(resource.RLIMIT_CPU, (120, 121))
    if sys.platform == "linux":
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY, MEMORY))
        resource.setrlimit(resource.RLIMIT_DATA, (MEMORY, MEMORY))
        if hasattr(resource, "RLIMIT_RSS"):
            resource.setrlimit(resource.RLIMIT_RSS, (MEMORY, MEMORY))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    resource.setrlimit(resource.RLIMIT_FSIZE, (PCM_BYTES, PCM_BYTES))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    signal.signal(signal.SIGALRM, lambda _signal, _frame: reject())
    signal.alarm(120)


def registered():
    os.write(3, b"READY\n")
    command = bytearray()
    while len(command) < 3:
        part = os.read(0, 3 - len(command))
        if not part:
            reject()
        command.extend(part)
    if command != b"GO\n":
        reject()
    os.close(3)


class TaskInfo(ctypes.Structure):
    _fields_ = [(name, ctypes.c_uint64) for name in (
        "virtual", "resident", "total_user", "total_system", "threads_user", "threads_system"
    )] + [(name, ctypes.c_int32) for name in (
        "policy", "faults", "pageins", "cow_faults", "messages_sent", "messages_received",
        "syscalls_mach", "syscalls_unix", "context_switches", "threads", "running", "priority"
    )]


def rss_reader(pid):
    if sys.platform == "darwin":
        library = ctypes.CDLL("/usr/lib/libproc.dylib", use_errno=True)
        read = library.proc_pidinfo
        read.argtypes = (ctypes.c_int, ctypes.c_int, ctypes.c_uint64, ctypes.c_void_p, ctypes.c_int)
        read.restype = ctypes.c_int

        def resident():
            info = TaskInfo()
            result = read(pid, 4, 0, ctypes.byref(info), ctypes.sizeof(info))
            if result != ctypes.sizeof(info):
                if ctypes.get_errno() == errno.ESRCH:
                    return None
                raise ValueError("monitor-unavailable")
            return info.resident

        return resident
    if sys.platform == "linux":
        def resident():
            try:
                fd = os.open(f"/proc/{pid}/status", os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
            except FileNotFoundError:
                return None
            try:
                data = os.read(fd, 16385)
                if len(data) > 16384:
                    raise ValueError("monitor-unavailable")
                for line in data.splitlines():
                    if line.startswith(b"VmRSS:"):
                        fields = line.split()
                        if len(fields) != 3 or fields[2] != b"kB" or not fields[1].isdigit():
                            raise ValueError("monitor-unavailable")
                        return int(fields[1]) * 1024
                return None
            finally:
                os.close(fd)
        return resident
    raise ValueError("monitor-unavailable")


def emit(value):
    data = (json.dumps(value, separators=(",", ":")) + "\n").encode("ascii")
    if len(data) > 256:
        reject()
    os.write(1, data)


def sample(pid):
    reader = rss_reader(pid)
    registered()
    os.set_blocking(0, False)
    poll = selectors.DefaultSelector()
    poll.register(0, selectors.EVENT_READ)
    started = time.monotonic()
    command = bytearray()
    gone = False
    try:
        while time.monotonic() - started < 120:
            resident = reader()
            if resident is None:
                if not gone:
                    emit({"event": "gone"})
                    gone = True
            elif resident > MEMORY:
                emit({"event": "failure", "code": "memory-limit"})
                os._exit(79)
            elif not gone:
                emit({"event": "sample", "rss": resident})
            for _key, _mask in poll.select(0.1):
                part = os.read(0, 8)
                if not part:
                    raise ValueError("monitor-unavailable")
                command.extend(part)
                if not b"STOP\n".startswith(command) or len(command) > 5:
                    raise ValueError("monitor-unavailable")
                if command == b"STOP\n":
                    emit({"event": "closed"})
                    return
        emit({"event": "failure", "code": "deadline"})
        os._exit(80)
    finally:
        poll.close()


def main():
    if len(sys.argv) < 3 or sys.argv[1] not in ("probe", "decode", "rss"):
        reject()
    limits()
    if sys.argv[1] == "rss":
        if len(sys.argv) != 3 or not sys.argv[2].isdigit() or not 1 <= int(sys.argv[2]) <= 2147483647:
            reject()
        sample(int(sys.argv[2]))
        return
    if len(sys.argv) < 4:
        reject()
    tool = sys.argv[2]
    if not os.path.isabs(tool) or any(ord(c) < 32 for c in tool):
        reject()
    directory = os.stat(".", follow_symlinks=False)
    if not stat.S_ISDIR(directory.st_mode) or directory.st_uid != os.getuid() or stat.S_IMODE(directory.st_mode) != 0o700:
        reject()
    source = os.open("source.bin", os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(source)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1 or not 1 <= info.st_size <= 200 * 1024 * 1024:
            reject()
    finally:
        os.close(source)
    registered()
    os.execve(tool, [tool, *sys.argv[3:]], {})


try:
    main()
except BaseException:
    try:
        emit({"event": "failure", "code": "monitor-unavailable"}) if len(sys.argv) > 1 and sys.argv[1] == "rss" else None
    except BaseException:
        pass
    reject()
