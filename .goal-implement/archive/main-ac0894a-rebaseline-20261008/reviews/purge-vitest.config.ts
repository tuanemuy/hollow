import {defineConfig} from 'vitest/config';
export default defineConfig({resolve:{alias:{'@repo/core':'/Users/hikaru/github.com/tuanemuy/hollow/packages/core/src'},tsconfigPaths:true},test:{environment:'node',include:['.goal-implement/reviews/purge-independent.integration.test.ts']}});
