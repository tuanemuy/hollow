import os
from pathlib import Path
import selectors
import signal
import stat
import subprocess
import time

ROOT = Path("/Users/hikaru/.local/share/hollow-validation/goal-implement-p5d-http-20261006-1c4b9f22")
TMP = ROOT.with_name(ROOT.name + "-cert-tool-tmp")
OPENSSL = Path("/usr/bin/openssl")
CONFIG = b"""[req]
prompt = no
distinguished_name = dn
x509_extensions = local_tls
[dn]
CN = openrouter.ai
[local_tls]
subjectAltName = DNS:openrouter.ai
basicConstraints = critical,CA:true,pathlen:0
keyUsage = critical,digitalSignature,keyEncipherment,keyCertSign
extendedKeyUsage = serverAuth
"""
class CertificateBoundary(Exception):
    pass

def require(value):
    if not value:
        raise CertificateBoundary("CERTIFICATE_BOUNDARY")

def metadata():
    value = OPENSSL.lstat()
    require(OPENSSL.resolve(strict=True) == OPENSSL and stat.S_ISREG(value.st_mode) and not OPENSSL.is_symlink() and value.st_uid == 0 and value.st_size == 1134000 and stat.S_IMODE(value.st_mode) == 0o755)

def present(group):
    try:
        os.killpg(group, 0)
    except ProcessLookupError:
        return "absent"
    except OSError:
        return "unproven"
    return "alive"

def signal_owned(group, value):
    if present(group) == "alive":
        try:
            os.killpg(group, value)
            return True
        except OSError:
            pass
    return False

def exclusive(path, data):
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_WRONLY, 0o600)
    try:
        require(os.write(fd, data) == len(data))
        os.fsync(fd)
    finally:
        os.close(fd)

def generate():
    metadata()
    identities = {}
    for path in (ROOT, TMP):
        value = path.lstat()
        require(stat.S_ISDIR(value.st_mode) and not path.is_symlink() and path.resolve(strict=True) == path and value.st_uid == os.getuid() and stat.S_IMODE(value.st_mode) == 0o700)
        identities[path] = (value.st_dev, value.st_ino)
    require(not list(TMP.iterdir()))
    for name in ("tls.key", "tls.crt", "tls-request.cnf"):
        require(not os.path.lexists(ROOT / name))
    exclusive(ROOT / "tls-request.cnf", CONFIG)
    key_fd = os.open(ROOT / "tls.key", os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_WRONLY, 0o600)
    identity = os.fstat(key_fd)
    child = None
    selector = selectors.DefaultSelector()
    started = time.monotonic()
    group = None
    eof = set()
    output = bytearray()
    count = 0
    try:
        child = subprocess.Popen([str(OPENSSL), "req", "-new", "-newkey", "rsa:2048", "-nodes", "-x509", "-sha256", "-days", "2", "-set_serial", "32", "-batch", "-config", str(ROOT / "tls-request.cnf"), "-extensions", "local_tls", "-keyout", f"/dev/fd/{key_fd}", "-out", "/dev/stdout"], env={"PATH": "/usr/bin:/bin", "TMPDIR": str(TMP), "HOME": str(TMP), "OPENSSL_CONF": str(ROOT / "tls-request.cnf")}, cwd=ROOT, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, pass_fds=(key_fd,), start_new_session=True)
        require(child.pid != os.getpgid(0) and os.getpgid(child.pid) == child.pid)
        group = child.pid
        for stream in (child.stdout, child.stderr):
            selector.register(stream, selectors.EVENT_READ)
        while selector.get_map() or child.poll() is None:
            require(time.monotonic() - started < 15)
            for path, expected in identities.items():
                value = path.lstat()
                require(stat.S_ISDIR(value.st_mode) and not path.is_symlink() and (value.st_dev, value.st_ino) == expected and value.st_uid == os.getuid() and stat.S_IMODE(value.st_mode) == 0o700)
            require(not list(TMP.iterdir()) and {entry.name for entry in ROOT.iterdir()} == {"tls.key", "tls-request.cnf"})
            current = os.fstat(key_fd)
            named = (ROOT / "tls.key").lstat()
            require(stat.S_ISREG(named.st_mode) and named.st_nlink == 1 and named.st_uid == os.getuid() and stat.S_IMODE(named.st_mode) == 0o600 and (named.st_dev, named.st_ino) == (identity.st_dev, identity.st_ino))
            require((current.st_dev, current.st_ino) == (identity.st_dev, identity.st_ino) and current.st_size <= 64 * 1024)
            for entry, _ in selector.select(0.2):
                data = os.read(entry.fd, 65536)
                if not data:
                    eof.add(entry.fileobj)
                    selector.unregister(entry.fileobj)
                else:
                    count += len(data)
                    require(count <= 64 * 1024)
                    if entry.fileobj is child.stdout:
                        output.extend(data)
        child.wait(timeout=1)
        require(child.returncode == 0 and len(eof) == 2 and present(group) == "absent")
        child.stdout.close()
        child.stderr.close()
        require(child.stdout.closed and child.stderr.closed)
        os.fsync(key_fd)
        final = os.fstat(key_fd)
        require(0 < final.st_size and final.st_size + len(output) <= 64 * 1024 and bytes(output).startswith(b"-----BEGIN CERTIFICATE-----") and bytes(output).rstrip().endswith(b"-----END CERTIFICATE-----"))
        exclusive(ROOT / "tls.crt", output)
        return {"actualExit": 0, "stdoutEOF": True, "stderrEOF": True, "pipeHandlesClosed": True, "ownPGState": "absent", "forced": False, "keyCertificateBytes": final.st_size + len(output), "opensslChildren": 1}
    except Exception:
        end = started + 30
        for value in (signal.SIGTERM, signal.SIGKILL):
            if group is not None and time.monotonic() < end:
                signal_owned(group, value)
                until = min(end, time.monotonic() + 10)
                while present(group) == "alive" and time.monotonic() < until:
                    if child:
                        child.poll()
                    time.sleep(0.2)
        if child:
            until = min(end, time.monotonic() + 10)
            while selector.get_map() and time.monotonic() < until:
                for entry, _ in selector.select(0.2):
                    if not os.read(entry.fd, 65536):
                        eof.add(entry.fileobj)
                        selector.unregister(entry.fileobj)
            child.poll()
        raise CertificateBoundary("CERTIFICATE_HELD") from None
    finally:
        selector.close()
        os.close(key_fd)
        for index in range(len(output)):
            output[index] = 0
        if child:
            child.stdout.close()
            child.stderr.close()
