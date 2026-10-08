import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import time

ROOT = Path("/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02")
REPO = Path("/Users/hikaru/github.com/tuanemuy/hollow")
SOURCE = ROOT / "source"
DIST = SOURCE / "apps/web/dist"
CANDIDATE = "b6e567b24e24c78e26bb1bbb147bdf0fc6588bd3"
TREE = "fa7f4fb746268b7d6ada09ff3264e73800634310"
SOURCE_SHA = "f1d7f33945f0977de5b1615639b8f96e6b15ded2207600d90ccd97adf78255b0"
BUILD_SHA = "c68604ccfb684efacc33603287e2bfca2192e1ce0f308f30630db285cf384d54"
ARTIFACTS_SHA = "58e3f66aa09d4a3a3503037133b67a41d87505d06c8defd4b037a118bc90283f"
HEAD_BLOBS_SHA = "1b8d0f287d1414e9d5f5a0fc925f61e43110f4f60dbca28dda857fcf89ea4acf"
LINKS_SHA = "0ac9e5654babf6ab31b808caf95984a77e2688490f32b535f4982372ad9b47c3"
SOURCE_FILES = 1457
SOURCE_BYTES = 20986203
OUTPUT_FILES = 492
OUTPUT_BYTES = 23202712
MIB = 1024**2
LIMITS = {"root": 256*MIB, "source_material": 32*MIB, "dist": 208*MIB,
          "logs": 8*MIB, "tmp": 8*MIB, "seconds": 600, "poll_ms": 200,
          "term_seconds": 10, "kill_seconds": 10, "pipe_seconds": 10}
REQUIRED = ["server/server.node.js", "server/nodeShutdown.mjs", "server/__vite_rsc_assets_manifest.js",
            "server/rsc/__vite_rsc_assets_manifest.js", "server/browse/searchSupervisor.mjs",
            "server/browse/searchQuery.mjs", "server/browse/publicQuery.mjs", "server/browse/noteProjection.mjs",
            "server/export/document.mjs", "server/pdf/engine.mjs", "server/pdf/documentWorker.mjs",
            "server/pdf/supervisor.py", "server/llm/sourceWorker.mjs", "server/llm/documentWorker.mjs",
            "server/llm/imageChild.mjs", "server/llm/pdfPagesChild.mjs"]
BUILD_KEYS = {"candidate", "tree", "root", "cwd", "dist", "links_sha256", "source_files", "source_bytes",
              "source_before_sha256", "source_after_sha256", "outputs", "required", "named_exports", "phases",
              "peak", "limits", "archive", "log_fd_closed", "runtime_started", "node"}
PHASE_KEYS = {"label", "argv", "pid", "actual_exit", "seconds", "known_absent", "stop_reason", "pipes", "log_fd_closed"}
FAILURES = {"DEADLINE", "JSON", "SCHEMA", "BINDING", "METADATA", "CHANGED", "HASH", "FILE_SET", "CAPACITY", "IO", "UNKNOWN"}

class BoundaryError(Exception):
    pass

def require(value, code):
    if not value:
        raise BoundaryError(code)

def integer(value):
    return type(value) is int and 0 <= value <= 2**53-1

def digest(value):
    return type(value) is str and re.fullmatch(r"[0-9a-f]{64}", value) is not None

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")

def pairs(values):
    result = {}
    for key, value in values:
        require(key not in result, "JSON")
        result[key] = value
    return result

def invalid_constant(_value):
    raise BoundaryError("JSON")

def decode(data):
    try:
        return json.loads(data, object_pairs_hook=pairs, parse_constant=invalid_constant)
    except BoundaryError:
        raise
    except (ValueError, UnicodeError, RecursionError):
        raise BoundaryError("JSON") from None

def keys(value, expected):
    require(type(value) is dict and set(value) == expected, "SCHEMA")

def relative(value):
    require(type(value) is str and 0 < len(value) <= 4096, "SCHEMA")
    parts = value.split("/")
    require(len(parts) <= 32 and all(part not in ("", ".", "..") for part in parts)
            and not value.startswith("/") and "\\" not in value, "SCHEMA")
    return value

class Reader:
    def __init__(self):
        self.deadline = time.monotonic() + 30
        self.closed = True
        self.totals = {"metadata": 0, "source": 0, "dist": 0}

    def check(self):
        require(time.monotonic() < self.deadline, "DEADLINE")

    def directory(self, path):
        self.check()
        value = path.lstat()
        require(stat.S_ISDIR(value.st_mode) and value.st_uid == os.getuid()
                and stat.S_IMODE(value.st_mode) == 0o700 and path.resolve(strict=True) == path, "METADATA")
        return value

    def file(self, path, maximum, category, expected_sha=None, expected_size=None, blob=None, retain=False, expected_identity=None):
        self.check()
        before = path.lstat()
        require(expected_identity is None or (before.st_dev, before.st_ino) == expected_identity, "CHANGED")
        require(stat.S_ISREG(before.st_mode) and before.st_uid == os.getuid() and before.st_nlink == 1
                and stat.S_IMODE(before.st_mode) == 0o600 and path.resolve(strict=True) == path, "METADATA")
        require(before.st_size <= maximum and (expected_size is None or before.st_size == expected_size), "CAPACITY")
        sha = hashlib.sha256()
        git = hashlib.sha1(b"blob " + str(before.st_size).encode() + b"\0")
        chunks = []
        count = 0
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        try:
            opened = os.fstat(fd)
            require((before.st_dev, before.st_ino) == (opened.st_dev, opened.st_ino), "CHANGED")
            while True:
                self.check()
                chunk = os.read(fd, 65536)
                if not chunk:
                    break
                count += len(chunk)
                cap = LIMITS["dist"] if category == "dist" else LIMITS["source_material"]
                used = self.totals["dist"] if category == "dist" else self.totals["metadata"] + self.totals["source"]
                require(count <= maximum and count <= before.st_size
                        and used + count <= cap, "CAPACITY")
                sha.update(chunk)
                git.update(chunk)
                if retain:
                    chunks.append(chunk)
            after = os.fstat(fd)
            signature = lambda v: (v.st_dev, v.st_ino, v.st_mode, v.st_uid, v.st_nlink, v.st_size, v.st_mtime_ns)
            require(signature(before) == signature(opened) == signature(after) == signature(path.lstat()), "CHANGED")
        finally:
            try:
                os.close(fd)
            except OSError:
                self.closed = False
                raise
        require(count == before.st_size and (expected_sha is None or sha.hexdigest() == expected_sha), "HASH")
        require(blob is None or git.hexdigest() == blob, "HASH")
        self.totals[category] += count
        cap = LIMITS["dist"] if category == "dist" else LIMITS["source_material"]
        used = self.totals["dist"] if category == "dist" else self.totals["metadata"] + self.totals["source"]
        require(used <= cap, "CAPACITY")
        return b"".join(chunks) if retain else None

    def source_link(self, path, entry):
        self.check()
        before = path.lstat()
        require(stat.S_ISLNK(before.st_mode) and before.st_uid == os.getuid() and before.st_nlink == 1, "METADATA")
        target = os.readlink(path)
        require(path == SOURCE / "AGENTS.md" and target == "CLAUDE.md", "BINDING")
        require((SOURCE / "CLAUDE.md").resolve(strict=True) == SOURCE / "CLAUDE.md", "BINDING")
        actual = (SOURCE / "CLAUDE.md").lstat()
        require(stat.S_ISREG(actual.st_mode) and actual.st_uid == os.getuid() and actual.st_nlink == 1
                and stat.S_IMODE(actual.st_mode) == 0o600, "METADATA")
        payload = target.encode()
        require(len(payload) == entry["bytes"] and hashlib.sha256(payload).hexdigest() == entry["sha256"]
                and hashlib.sha1(b"blob " + str(len(payload)).encode() + b"\0" + payload).hexdigest() == entry["blob"], "HASH")
        after = path.lstat()
        require((before.st_dev, before.st_ino, before.st_mtime_ns) == (after.st_dev, after.st_ino, after.st_mtime_ns), "CHANGED")
        self.totals["source"] += len(payload)
        require(self.totals["metadata"] + self.totals["source"] <= LIMITS["source_material"], "CAPACITY")

    def output_set(self, outputs):
        directories = {"": set()}
        for name in outputs:
            parts = name.split("/")
            for index, part in enumerate(parts):
                parent = "/".join(parts[:index])
                directories.setdefault(parent, set()).add(part)
                if index < len(parts)-1:
                    directories.setdefault("/".join(parts[:index+1]), set())
        require(len(directories) + len(outputs) <= 32768, "CAPACITY")
        for name, expected in directories.items():
            self.check()
            path = DIST / name
            before = self.directory(path)
            with os.scandir(path) as items:
                actual = set()
                for entry in items:
                    self.check()
                    actual.add(entry.name)
                    require(len(actual) <= 32768, "CAPACITY")
            require(actual == expected, "FILE_SET")
            after = self.directory(path)
            require((before.st_dev, before.st_ino, before.st_mtime_ns) == (after.st_dev, after.st_ino, after.st_mtime_ns), "CHANGED")

def phase(value, label, argv):
    keys(value, PHASE_KEYS)
    require(value["label"] == label and value["argv"] == argv and integer(value["pid"]) and value["pid"] > 0
            and type(value["actual_exit"]) is int and value["actual_exit"] == 0
            and type(value["seconds"]) in (int, float) and 0 <= value["seconds"] <= 600
            and value["stop_reason"] is None and value["log_fd_closed"] is True
            and value["pipes"] == "unused; stdout/stderr redirected to owned log FD", "BINDING")
    keys(value["known_absent"], {"pid", "pg"})
    require(value["known_absent"]["pid"] is True and value["known_absent"]["pg"] is True, "BINDING")

def validate(reader):
    for path in (ROOT, ROOT / "material", SOURCE, SOURCE / "apps", SOURCE / "apps/web", DIST):
        reader.directory(path)
    source_data = reader.file(ROOT / "material/source-manifest.json", LIMITS["source_material"], "metadata", SOURCE_SHA, 322233, retain=True)
    build_data = reader.file(ROOT / "material/build-manifest.json", LIMITS["source_material"], "metadata", BUILD_SHA, 82459, retain=True)
    source = decode(source_data)
    build = decode(build_data)
    keys(build, BUILD_KEYS)
    require(build["candidate"] == CANDIDATE and build["tree"] == TREE and build["root"] == str(ROOT)
            and build["cwd"] == str(SOURCE / "apps/web") and build["dist"] == str(DIST)
            and build["links_sha256"] == LINKS_SHA and build["source_before_sha256"] == SOURCE_SHA
            and build["source_after_sha256"] == SOURCE_SHA and build["log_fd_closed"] is True
            and build["runtime_started"] is False and build["node"] == "v24.15.0", "BINDING")
    keys(build["limits"], set(LIMITS))
    require(all(type(build["limits"][key]) is int and build["limits"][key] == value for key, value in LIMITS.items()), "BINDING")
    keys(build["peak"], {"root", "source_material", "dist", "logs", "tmp"})
    require(all(integer(value) and value <= LIMITS[key] for key, value in build["peak"].items()), "CAPACITY")
    phase(build["archive"], "archive", ["git", "-C", str(REPO), "archive", "--format=tar.gz", "--output=" + str(ROOT / "source-archive.tar.gz"), CANDIDATE])
    require(type(build["phases"]) is list and len(build["phases"]) == 2, "SCHEMA")
    phase(build["phases"][0], "vite", ["node", str(SOURCE / "apps/web/node_modules/vite/bin/vite.js"), "build", "--config", str(SOURCE / "apps/web/vite.config.node.ts")])
    phase(build["phases"][1], "search", ["node", str(SOURCE / "apps/web/scripts/build-search.node.mjs")])
    require(type(source) is dict and len(source) == SOURCE_FILES and type(build["source_files"]) is int
            and build["source_files"] == SOURCE_FILES and type(build["source_bytes"]) is int
            and build["source_bytes"] == SOURCE_BYTES, "BINDING")
    blobs = {}
    links = 0
    executable = 0
    for name, entry in source.items():
        relative(name)
        keys(entry, {"mode", "blob", "bytes", "sha256"})
        require(entry["mode"] in ("100644", "100755", "120000") and type(entry["blob"]) is str
                and re.fullmatch(r"[0-9a-f]{40}", entry["blob"]) is not None
                and integer(entry["bytes"]) and digest(entry["sha256"]), "SCHEMA")
        blobs[name] = {"mode": entry["mode"], "blob": entry["blob"]}
        if entry["mode"] == "120000":
            reader.source_link(SOURCE / name, entry)
            links += 1
        else:
            reader.file(SOURCE / name, LIMITS["source_material"], "source", entry["sha256"], entry["bytes"], entry["blob"])
            if entry["mode"] == "100755":
                require(name == "infra/shared-server/provision.sh", "BINDING")
                executable += 1
    require(links == 1 and executable == 1 and reader.totals["source"] == SOURCE_BYTES
            and hashlib.sha256(canonical(blobs)).hexdigest() == HEAD_BLOBS_SHA, "BINDING")
    outputs = build["outputs"]
    require(type(outputs) is dict and len(outputs) == OUTPUT_FILES and build["required"] == REQUIRED, "BINDING")
    for name, entry in outputs.items():
        relative(name)
        keys(entry, {"bytes", "sha256"})
        require(integer(entry["bytes"]) and digest(entry["sha256"]), "SCHEMA")
    require(hashlib.sha256(canonical(outputs)).hexdigest() == ARTIFACTS_SHA and all(name in outputs for name in REQUIRED), "HASH")
    keys(build["named_exports"], {"NodeDriveBackupSource"})
    named = build["named_exports"]["NodeDriveBackupSource"]
    keys(named, {"entry", "local_identifier", "entry_sha256"})
    require(named["entry"] == "server/server.node.js" and type(named["local_identifier"]) is str
            and re.fullmatch(r"[A-Za-z_$][A-Za-z0-9_$]*", named["local_identifier"]) is not None
            and named["entry_sha256"] == outputs["server/server.node.js"]["sha256"], "BINDING")
    reader.output_set(outputs)
    for name, entry in outputs.items():
        reader.file(DIST / name, LIMITS["dist"], "dist", entry["sha256"], entry["bytes"])
    require(reader.totals["dist"] == OUTPUT_BYTES and reader.closed, "BINDING")
    release = {"schemaVersion": 1, "candidate": CANDIDATE,
               "sourceManifestSha": SOURCE_SHA, "buildManifestSha": BUILD_SHA, "artifactsManifestSha": ARTIFACTS_SHA,
               "source": {"files": SOURCE_FILES, "bytes": reader.totals["source"]},
               "artifacts": {"files": OUTPUT_FILES, "bytes": reader.totals["dist"]}}
    data = canonical(release)
    require(len(data) <= 4096 and build["peak"]["root"] + len(data) <= LIMITS["root"]
            and build["peak"]["source_material"] + len(data) <= LIMITS["source_material"], "CAPACITY")
    reader.check()
    return data

def write(reader, data):
    reader.check()
    reader.directory(ROOT / "material")
    target = ROOT / "material/release-manifest.json"
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    closed = False
    try:
        original = os.fstat(fd)
        output_identity = (original.st_dev, original.st_ino)
        require(stat.S_ISREG(original.st_mode) and original.st_uid == os.getuid() and original.st_nlink == 1
                and stat.S_IMODE(original.st_mode) == 0o600 and original.st_size == 0, "METADATA")
        offset = 0
        while offset < len(data):
            reader.check()
            count = os.write(fd, data[offset:])
            require(count > 0, "IO")
            offset += count
        os.fsync(fd)
        after = os.fstat(fd)
        require((after.st_dev, after.st_ino) == (original.st_dev, original.st_ino) and after.st_size == len(data), "CHANGED")
    finally:
        os.close(fd)
        closed = True
    reader.check()
    require(closed, "IO")
    actual = reader.file(target, 4096, "metadata", hashlib.sha256(data).hexdigest(), len(data), retain=True, expected_identity=output_identity)
    require(actual == data and reader.closed, "HASH")
    reader.check()
    return closed

def main():
    actual = sys.argv[1:] == ["--run"]
    reader = Reader()
    try:
        require(sys.argv[1:] in ([], ["--run"]), "SCHEMA")
        data = validate(reader)
        closed = write(reader, data) if actual else None
        print(json.dumps({"ok": True, "actualWrite": actual, "releaseBytes": len(data),
                          "releaseSha": hashlib.sha256(data).hexdigest(), "schemaVersion": 1,
                          "candidate": CANDIDATE, "sourceFiles": SOURCE_FILES, "sourceBytes": SOURCE_BYTES,
                          "artifactFiles": OUTPUT_FILES, "artifactBytes": OUTPUT_BYTES,
                          "readFDClosed": reader.closed, "writeFDClosed": closed, "databaseAudit": False}, separators=(",", ":")))
        return 0
    except BoundaryError as error:
        code = error.args[0] if len(error.args) == 1 and type(error.args[0]) is str and error.args[0] in FAILURES else "UNKNOWN"
    except OSError:
        code = "IO"
    except Exception:
        code = "UNKNOWN"
    print(json.dumps({"ok": False, "held": True, "writeRequested": actual, "failure": code,
                      "databaseAudit": False}, separators=(",", ":")))
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
