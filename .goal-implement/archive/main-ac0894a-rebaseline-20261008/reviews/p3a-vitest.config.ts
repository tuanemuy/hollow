import { defineConfig } from 'vitest/config';
export default defineConfig({resolve:{tsconfigPaths:true,alias:{'@repo/core':'/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src'}},test:{environment:'node',include:['.goal-implement/reviews/p3a-independent.integration.test.ts']}});
