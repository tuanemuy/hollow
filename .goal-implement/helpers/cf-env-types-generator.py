import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import stat
import sys
import tomllib

CONFIG_SHA256 = "0a599c80196b5f1250227071d56770df2af94179293ca172be23a1e54f166886"
WORKERS_SHA256 = "b2e69e6ab70aa354fec99eee7bca72d63f5979539df6c4202981f4a7f90ae79c"
WORKERS_FILE = Path("/Users/hikaru/github.com/tuanemuy/hollow/node_modules/.pnpm/@cloudflare+workers-types@4.20260511.1/node_modules/@cloudflare/workers-types/index.d.ts")
MAX_BYTES = 2 * 1024 * 1024
ROLE_NAMES = {"relay": "RelayEnv", "consumer": "ConsumerEnv", "pruner": "PrunerEnv", "dlq": "DlqEnv"}
ENTRY_NAMES = {"top": "app/server.cloudflare.ts", "relay": "app/worker/cloudflare/relay.ts", "consumer": "app/worker/cloudflare/consumer.ts", "pruner": "app/worker/cloudflare/pruner.ts", "dlq": "app/worker/cloudflare/dlq.ts"}
MANIFEST = {
    "top": {"APP_URL": '"http://localhost:8787"', "ASSETS": "Fetcher", "DB": "D1Database", "RELAY": "Fetcher"},
    "relay": {"APP_URL": '"http://localhost:8787"', "DB": "D1Database", "EVENTS_QUEUE": "Queue", "OUTBOX_BATCH_SIZE": '"100"', "OUTBOX_LEASE_MS": '"300000"', "OUTBOX_MAX_ATTEMPTS": '"2"'},
    "consumer": {"APP_URL": '"http://localhost:8787"', "DB": "D1Database"},
    "pruner": {"APP_URL": '"http://localhost:8787"', "DB": "D1Database", "OUTBOX_RETENTION_MS": '"604800000"'},
    "dlq": {"APP_URL": '"http://localhost:8787"', "DB": "D1Database"},
}

class BoundaryError(Exception):
    pass


def require(condition, code):
    if not condition:
        raise BoundaryError(code)


def alarm(_signal, _frame):
    raise BoundaryError("deadline")


def canonical_directory(directory):
    value = directory.lstat()
    require(directory.is_absolute() and directory.resolve(strict=True) == directory, "directory-path")
    require(stat.S_ISDIR(value.st_mode) and not stat.S_ISLNK(value.st_mode) and value.st_uid == os.getuid() and stat.S_IMODE(value.st_mode) == 0o700, "directory-mode")
    return value


def regular(file, maximum=MAX_BYTES):
    value = file.lstat()
    require(stat.S_ISREG(value.st_mode) and not stat.S_ISLNK(value.st_mode) and value.st_nlink == 1 and value.st_uid == os.getuid() and value.st_size <= maximum, "regular-file")
    return value


def read_exact(file, expected, maximum=MAX_BYTES):
    before = regular(file, maximum)
    fd = os.open(file, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        require((before.st_dev, before.st_ino) == (opened.st_dev, opened.st_ino), "read-identity")
        chunks = []
        total = 0
        while chunk := os.read(fd, 64 * 1024):
            total += len(chunk)
            require(total <= maximum, "read-bound")
            chunks.append(chunk)
        data = b"".join(chunks)
    finally:
        os.close(fd)
    after = regular(file, maximum)
    require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns), "read-changed")
    require(hashlib.sha256(data).hexdigest() == expected, "source-hash")
    return data


def fields(config):
    known_keys = {"name", "main", "compatibility_date", "compatibility_flags", "assets", "vars", "d1_databases", "services", "queues", "triggers", "env"}
    require(set(config) <= known_keys, "unknown-config-key")
    require(config.get("compatibility_date") == "2026-05-01" and config.get("compatibility_flags") == ["nodejs_compat"], "compatibility")
    result = {}
    def add(name, value):
        require(isinstance(name, str) and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name) is not None and name not in result, "binding-name")
        result[name] = value
    for name, value in config.get("vars", {}).items():
        require(isinstance(value, str), "variable-type")
        add(name, json.dumps(value, ensure_ascii=True))
    assets = config.get("assets")
    if assets is not None:
        require(set(assets) == {"directory", "binding"}, "assets-shape")
        add(assets["binding"], "Fetcher")
    for database in config.get("d1_databases", []):
        require(set(database) == {"binding", "database_name", "database_id", "migrations_dir"}, "database-shape")
        add(database["binding"], "D1Database")
    for service in config.get("services", []):
        require(set(service) == {"binding", "service"}, "service-shape")
        add(service["binding"], "Fetcher")
    queues = config.get("queues", {})
    require(set(queues) <= {"producers", "consumers"}, "queues-shape")
    for queue in queues.get("producers", []):
        require(set(queue) == {"binding", "queue"}, "queue-shape")
        add(queue["binding"], "Queue")
    return result


def generate(config, tree):
    require(set(config.get("env", {})) == set(ROLE_NAMES), "environment-manifest")
    roles = {"top": config, **config["env"]}
    actual = {name: fields(role) for name, role in roles.items()}
    require(actual == MANIFEST, "binding-manifest")
    for name, role in roles.items():
        require(role.get("main") == ENTRY_NAMES[name], "entry-manifest")
        entry = tree / "apps/web" / ENTRY_NAMES[name]
        regular(entry)
        require(entry.resolve(strict=True) == entry, "entry-path")
    keys = sorted(set().union(*(set(value) for value in actual.values())))
    required = set.intersection(*(set(value) for value in actual.values()))
    lines = ['/// <reference types="@cloudflare/workers-types" />', "", "declare namespace Cloudflare {", '  interface GlobalProps { mainModule: typeof import("./app/server.cloudflare"); }', "  interface Env {"]
    for key in keys:
        values = sorted({role[key] for role in actual.values() if key in role})
        lines.append(f"    {key}{'' if key in required else '?'}: {' | '.join(values)};")
    lines.append("  }")
    for name, interface in ROLE_NAMES.items():
        lines.append(f"  interface {interface} {{")
        for key, value in sorted(actual[name].items()):
            lines.append(f"    {key}: {value};")
        lines.append("  }")
    lines.extend(["}", "interface Env extends Cloudflare.Env {}", ""])
    return "\n".join(lines).encode("utf-8"), sorted(required), keys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree", required=True)
    parser.add_argument("--tool-root", required=True)
    args = parser.parse_args()
    tree = Path(args.tree)
    tool_root = Path(args.tool_root)
    require(tree.is_absolute() and tool_root == tree / ".public-cf-types-tool", "argv-path")
    tree_identity = canonical_directory(tree)
    output = tree / "apps/web/worker-configuration.d.ts"
    require(not os.path.lexists(output) and not os.path.lexists(tool_root), "fresh-gate")
    web = tree / "apps/web"
    require(web.resolve(strict=True) == web and web.is_dir() and not web.is_symlink(), "output-parent")
    config_file = web / "wrangler.toml"
    config_data = read_exact(config_file, CONFIG_SHA256)
    require(WORKERS_FILE.resolve(strict=True) == WORKERS_FILE, "public-types-path")
    require((web / "node_modules/@cloudflare/workers-types/index.d.ts").resolve(strict=True) == WORKERS_FILE, "public-types-binding")
    types = read_exact(WORKERS_FILE, WORKERS_SHA256)
    for declaration in [b"declare abstract class D1Database", b"interface Fetcher", b"interface Queue", b"interface DurableObjectState", b'declare module "cloudflare:workers"']:
        require(declaration in types, "formal-types")
    config = tomllib.loads(config_data.decode("utf-8", "strict"))
    content, required, keys = generate(config, tree)
    require(len(content) <= MAX_BYTES, "output-bound")
    os.mkdir(tool_root, 0o700)
    canonical_directory(tool_root)
    require(not any(tool_root.iterdir()), "tool-root-empty")
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        position = 0
        while position < len(content):
            position += os.write(fd, content[position:])
        os.fsync(fd)
        identity = os.fstat(fd)
    finally:
        os.close(fd)
    parent_fd = os.open(web, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)
    saved = regular(output)
    require(stat.S_IMODE(saved.st_mode) == 0o600 and (saved.st_dev, saved.st_ino) == (identity.st_dev, identity.st_ino), "output-identity")
    read_exact(output, hashlib.sha256(content).hexdigest())
    current = canonical_directory(tree)
    require((current.st_dev, current.st_ino) == (tree_identity.st_dev, tree_identity.st_ino), "tree-changed")
    canonical_directory(tool_root)
    require(not any(tool_root.iterdir()), "tool-root-residual")
    print(json.dumps({"ok": True, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(), "required": required, "bindings": keys, "environments": sorted(ROLE_NAMES), "children": 0, "workers": 0, "network": 0, "database": 0, "includeRuntime": False, "fileHandlesClosed": True}, separators=(",", ":")))


if __name__ == "__main__":
    os.umask(0o077)
    signal.signal(signal.SIGALRM, alarm)
    signal.setitimer(signal.ITIMER_REAL, 30)
    try:
        main()
    except (BoundaryError, OSError, ValueError, tomllib.TOMLDecodeError):
        print('{"ok":false,"error":"preflight-or-generation-failed"}', file=sys.stderr)
        sys.exit(1)
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
