import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { guardResourceRequest } from "./resourceRequestGuard.node";

it("routes only same-origin exact icon images onward to current private authorization", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const path = `/api/workspace-icons/${id}/${id}`;
  for (const method of ["GET", "HEAD"]) {
    expect(
      await guardResourceRequest(
        new Request(`http://localhost:3000${path}`, {
          method,
          headers: {
            "sec-fetch-dest": "image",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).toBeNull();
  }
  for (const site of ["cross-site", "same-site", "none"]) {
    expect(
      (
        await guardResourceRequest(
          new Request(`http://localhost:3000${path}`, {
            headers: { "sec-fetch-dest": "image", "sec-fetch-site": site },
          }),
        )
      )?.status,
    ).toBe(403);
  }
  expect(
    (
      await guardResourceRequest(
        new Request(`http://localhost:3000${path}/other`, {
          headers: {
            "sec-fetch-dest": "image",
            "sec-fetch-site": "same-origin",
          },
        }),
      )
    )?.status,
  ).toBe(403);
});

it("rejects media-destination dynamic routes before an authenticated handler and permits only exact assets or real static files", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hollow-resource-guard-"));
  let handled = 0;
  try {
    await writeFile(path.join(dir, "safe.png"), new Uint8Array([1, 2, 3]));
    const dispatch = async (request: Request) => {
      const guarded = await guardResourceRequest(request, dir);
      if (guarded) return guarded;
      handled++;
      return new Response("dynamic");
    };
    for (const dest of ["image", "video", "audio", "font"]) {
      for (const pathname of [
        "/signin",
        "/verify-email?token=synthetic",
        "/_serverFn/test",
        "/api/hollow/uploads/test",
        "/assets/missing.png",
        "/safe.png/../signin",
        "/api/notes/x/assets/y",
      ]) {
        const r = await dispatch(
          new Request(`http://localhost:3000${pathname}`, {
            headers: { "sec-fetch-dest": dest, cookie: "synthetic=value" },
          }),
        );
        expect(r.status).toBe(403);
      }
    }
    expect(handled).toBe(0);
    const id = "00000000-0000-0000-0000-000000000001";
    for (const site of ["same-site", "cross-site"]) {
      expect(
        (
          await guardResourceRequest(
            new Request(`http://localhost:3000/api/notes/${id}/assets/${id}`, {
              headers: { "sec-fetch-dest": "image", "sec-fetch-site": site },
            }),
            dir,
          )
        )?.status,
      ).toBe(403);
    }
    for (const method of ["GET", "HEAD"])
      for (const range of ["bytes=0-1", "bytes=999999-"]) {
        expect(
          await guardResourceRequest(
            new Request(`http://localhost:3000/api/notes/${id}/assets/${id}`, {
              method,
              headers: {
                "sec-fetch-dest": "image",
                "sec-fetch-site": "same-origin",
                range,
              },
            }),
            dir,
          ),
        ).toBeNull();
      }
    expect(
      (
        await dispatch(
          new Request("http://localhost:3000/safe.png", {
            headers: { "sec-fetch-dest": "image" },
          }),
        )
      ).status,
    ).toBe(200);
    expect(handled).toBe(0);
    expect(
      await guardResourceRequest(
        new Request("http://localhost:3000/signin", {
          headers: { "sec-fetch-dest": "document" },
        }),
        dir,
      ),
    ).toBeNull();
    expect(
      await guardResourceRequest(
        new Request("http://localhost:3000/signin"),
        dir,
      ),
    ).toBeNull();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
