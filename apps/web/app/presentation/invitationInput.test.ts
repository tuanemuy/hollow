import { describe, expect, it } from "vitest";
import { signUpSchema } from "./hollowSchemas";
import {
  invitationAuthSearchSchema,
  invitationDestination,
  invitationSelection,
  invitationSelectionSchema,
} from "./invitationInput";

const id = "00000000-0000-7000-8000-000000000001";
describe("invitation selection boundary", () => {
  it("requires a valid finite selection rather than arbitrary authorization payload", () => {
    expect(invitationSelectionSchema.parse({ id, generation: 1 })).toEqual({
      id,
      generation: 1,
    });
    for (const generation of [
      0,
      -1,
      1.5,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ])
      expect(
        invitationSelectionSchema.safeParse({ id, generation }).success,
      ).toBe(false);
    expect(
      invitationSelectionSchema.safeParse({
        id,
        generation: 1,
        browserToken: "untrusted",
      }).success,
    ).toBe(false);
  });
  it("rejects partial and malformed URL selection", () => {
    expect(
      invitationAuthSearchSchema.safeParse({
        invitation: true,
        invitationId: id,
      }).success,
    ).toBe(false);
    expect(
      invitationAuthSearchSchema.safeParse({
        invitation: true,
        invitationId: "other",
        invitationGeneration: 1,
      }).success,
    ).toBe(false);
    expect(
      invitationSelection(
        invitationAuthSearchSchema.parse({
          invitation: true,
          invitationId: id,
          invitationGeneration: 2,
        }),
      ),
    ).toEqual({ id, generation: 2 });
  });
  it("keeps ordinary signup independent but requires selection for confirmation exemption", () => {
    const plain = {
      email: "one@example.test",
      password: "test-password",
      termsAccepted: true,
    };
    expect(signUpSchema.safeParse(plain).success).toBe(true);
    expect(signUpSchema.safeParse({ ...plain, invitation: true }).success).toBe(
      false,
    );
    expect(
      signUpSchema.safeParse({
        ...plain,
        invitation: true,
        invitationSelection: { id, generation: 1 },
      }).success,
    ).toBe(true);
  });
  it("returns only non-secret identity and generation in the destination", () => {
    expect(invitationDestination({ id, generation: 3 })).toBe(
      `/invitations?invitationId=${id}&invitationGeneration=3`,
    );
    expect(invitationDestination()).toBe("/invitations");
  });
});
