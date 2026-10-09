import { execFile } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const script = String.raw`
import importlib.util, os, subprocess, sys, time
spec = importlib.util.spec_from_file_location("pdf_supervisor", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
case = sys.argv[2]
child = subprocess.Popen(["/bin/cat"], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
pin = module.ChildPin(child)
pgid, sid, waitid = os.getpgid, os.getsid, os.waitid
def rejected():
    try:
        pin.prove()
    except module.Rejected as error:
        assert error.code == 77 and error.reason == "ownership-unproven"
        assert pin.exit is None and not pin.reaped
    else:
        raise AssertionError("ownership refusal missing")
def missing(pid):
    raise ProcessLookupError(3, "synthetic exit race")
try:
    if case != "unproved":
        pin.prove()
        assert pin.session_proved
    if case in ("pgid-exit", "sid-exit"):
        setattr(module.os, "getpgid" if case == "pgid-exit" else "getsid", missing)
        observations = 0
        def pending_exit(*args):
            global observations
            observations += 1
            return None if observations <= 2 else waitid(*args)
        module.os.waitid = pending_exit
        child.stdin.close()
        pin.prove()
        assert pin.exit == 0 and pin.session_proved and not pin.reaped
        assert waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT).si_pid == child.pid
        assert pin.reap() == 0 and pin.reaped
    elif case == "alive-timeout":
        module.os.getpgid = missing
        began = time.monotonic()
        rejected()
        assert time.monotonic() - began < .5
        assert child.poll() is None and pin.session_proved
    elif case == "unproved":
        module.os.getpgid = missing
        rejected()
        assert not pin.session_proved and child.poll() is None
    elif case == "other-errno":
        def denied(pid):
            raise PermissionError(1, "synthetic refusal")
        module.os.getpgid = denied
        rejected()
        assert child.poll() is None
    elif case == "changed-session":
        module.os.getsid = lambda pid: pid + 1
        rejected()
        assert child.poll() is None
    elif case == "stable-live":
        members, escaped = pin.inspect()
        assert not members and not escaped and pin.exit is None and not pin.reaped
        child.stdin.close()
        until = time.monotonic() + 2
        while pin.exit is None and time.monotonic() < until:
            pin.observe_exit()
            if pin.exit is None:
                time.sleep(.001)
        assert pin.exit == 0 and pin.reap() == 0
    else:
        raise AssertionError("unknown case")
    print("verified:" + case)
finally:
    module.os.getpgid, module.os.getsid, module.os.waitid = pgid, sid, waitid
    if not child.stdin.closed:
        child.stdin.close()
    child.wait(timeout=2)
`;

describe("PDF unreaped native owner proof", () => {
  it.each([
    "pgid-exit",
    "sid-exit",
    "alive-timeout",
    "unproved",
    "other-errno",
    "changed-session",
    "stable-live",
  ])("keeps the real child ownership fence for %s", async (name) => {
    const result = await promisify(execFile)(
      "python3",
      [
        "-c",
        script,
        fileURLToPath(new URL("../pdf/supervisor.py", import.meta.url)),
        name,
      ],
      {
        timeout: 10_000,
        maxBuffer: 65536,
        env: { PATH: process.env.PATH, LANG: "C", TMPDIR: os.tmpdir() },
      },
    );
    expect(result.stdout.trim()).toBe(`verified:${name}`);
    expect(result.stderr).toBe("");
  });
});
