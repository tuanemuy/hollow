import { describe, expect, it } from "vitest";
import {
  acknowledgedMediaAliases,
  removeDraftMedia,
  rewriteAcknowledgedMedia,
} from "./canonicalMedia";
import { prepare, schema, serialize } from "./model";
import { WysSession } from "./session";

const draftId = "11111111-1111-7111-8111-111111111111";
const noteId = "22222222-2222-7222-8222-222222222222";
const assetId = "33333333-3333-7333-8333-333333333333";
const source = `/api/drafts/${draftId}/assets/${assetId}`;
const stable = `/api/notes/${noteId}/assets/${assetId}`;

describe("new-note scope media removal", () => {
  it("removes only media owned by the abandoned draft and preserves source bytes", () => {
    const retained = `<p class='keep' data-url="${source}">本文 &amp; 保持</p><!-- <img src="${source}"> --><img src="${stable}" alt="保存済み"><img src="/api/drafts/${noteId}/assets/${assetId}">`;
    const inserted = `<img src="${source}" alt="今回"><video src='${source}' controls><p>fallback</p></video>`;
    expect(removeDraftMedia(retained + inserted, draftId)).toBe(retained);
  });

  it("keeps text and attributes that resemble paths, including script contents", () => {
    const original = `<script>const s='<img src="${source}">'</script><code>&lt;img src="${source}"&gt;</code><p>${source}</p>`;
    expect(removeDraftMedia(original, draftId)).toBe(original);
  });
});

describe("acknowledged WYS media canonical transition", () => {
  it("does not register comment, code or unrelated attribute lookalikes", () => {
    const submitted = `<!-- <img src="${source}"> --><code>&lt;img src="${source}"&gt;</code><p data-url="${source}">保持</p>`;
    const aliases = acknowledgedMediaAliases({
      submitted,
      canonical: submitted,
      draftId,
      noteId,
    });
    expect(aliases.size).toBe(0);
    expect(
      rewriteAcknowledgedMedia(submitted, new Map([[source, stable]])),
    ).toBe(submitted);
  });
  it("checks final rewritten UTF8 bytes, not just the source bytes", () => {
    const html = `<p>本文</p><img src="${source}">`;
    expect(() =>
      rewriteAcknowledgedMedia(html, new Map([[source, "あ".repeat(280000)]])),
    ).toThrow("置換後の完全HTML");
    expect(
      rewriteAcknowledgedMedia(html, new Map([[source, stable]])),
    ).toContain(stable);
  });
  it("rewrites only actual media source, not visible text, attributes or foreign drafts", () => {
    const submitted = `<p>src="${source}"</p><img title='keep src="${source}"' src="${source}"><aside><video src='${source}'></video></aside><img src="/api/drafts/other/assets/${assetId}">`;
    const acknowledgement = { submitted, canonical: "", draftId, noteId };
    const aliases = acknowledgedMediaAliases(acknowledgement);
    expect(rewriteAcknowledgedMedia(submitted, aliases)).toBe(
      `<p>src="${source}"</p><img title='keep src="${source}"' src="${stable}"><aside><video src='${stable}'></video></aside><img src="/api/drafts/other/assets/${assetId}">`,
    );
  });
  it("preserves exact state/undo and aliases media hidden only in retained history", () => {
    const plan = prepare("<p>A</p>");
    const session = new WysSession(plan);
    session.admit(
      session.state.tr.insert(
        2,
        schema.nodes.image.create({ src: source, alt: "説明" }),
      ),
    );
    const submitted = session.html;
    const canonical = submitted.replace(source, stable);
    const state = session.state;
    expect(session.acknowledge({ submitted, canonical, draftId, noteId })).toBe(
      true,
    );
    expect(session.state).toBe(state);
    expect(session.html).toBe(canonical);
    session.history("undo", () => {});
    expect(session.html).toBe("<p>A</p>");
    session.history("redo", () => {});
    expect(session.html).toBe(canonical);
    expect(plan.source).toBe("<p>A</p>");
    session.admit(session.state.tr.insertText("追記", 1));
    expect(session.html).toContain(stable);
    expect(session.html).toContain("追記");
    expect(session.acknowledgedMediaCount).toBe(1);
    expect(session.resetHistory(() => false)).toBe(false);
    expect(session.acknowledgedMediaCount).toBe(1);
    expect(session.resetHistory(() => true)).toBe(true);
    expect(session.acknowledgedMediaCount).toBe(1);
    session.admit(session.state.tr.delete(1, session.state.doc.content.size));
    expect(session.resetHistory(() => true)).toBe(true);
    expect(session.acknowledgedMediaCount).toBe(0);
  });
  it("rejects stale acknowledgements after later input and arbitrary safe structural/attribute changes", () => {
    const submitted = `<p>A<img src="${source}" alt=""></p>`;
    const session = new WysSession(prepare(submitted));
    const canonical = submitted.replace(source, stable);
    expect(
      session.acknowledge({
        submitted,
        canonical: canonical.replace("<p>", '<p class="new">'),
        draftId,
        noteId,
      }),
    ).toBe(false);
    expect(
      session.acknowledge({ submitted, canonical, draftId, noteId: draftId }),
    ).toBe(false);
    session.admit(session.state.tr.insertText("最新", 1));
    const state = session.state;
    expect(session.acknowledge({ submitted, canonical, draftId, noteId })).toBe(
      false,
    );
    expect(session.state).toBe(state);
    expect(session.html).toContain("最新");
  });
  it("emits canonical safe new links and video descriptions without unsafe parent attributes", () => {
    const plan = prepare("<p>A</p>");
    const session = new WysSession(plan);
    session.admit(
      session.state.tr.addMark(
        1,
        2,
        schema.marks.link.create({ href: "https://example.com" }),
      ),
    );
    expect(session.html).toContain(
      'href="https://example.com" rel="noopener noreferrer"',
    );
    session.admit(
      session.state.tr.insert(
        2,
        schema.nodes.video.create({ src: source, alt: "動画" }),
      ),
    );
    expect(session.html).toContain(
      `src="${source}" aria-label="動画" controls preload="metadata"`,
    );
    const existing = prepare(
      `<p><video src="${stable}" controls aria-label="既存"></video></p>`,
    );
    expect(existing.doc.firstChild?.firstChild?.attrs.alt).toBe("既存");
    expect(serialize(existing, existing.doc)).toBe(existing.source);
  });
});
