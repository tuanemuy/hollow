import type { HollowContainer } from "@repo/core/application/di/hollowTypes";
import { projectNote } from "../../node/browse/projection";

export const browseFixture: NonNullable<HollowContainer["browsing"]> = {
  projection: {
    async project(input) {
      return projectNote(input);
    },
  },
  execution: {
    async execute() {
      throw new Error("This fixture does not execute reads");
    },
    async stop() {},
  },
};
