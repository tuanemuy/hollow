# C0 logical4 Root direct PUBLIC/SOURCE precheck

{
  "time": "2026-10-06T13:18:46.602922+00:00",
  "sourceFiles": 1474,
  "sourceBytes": 21303283,
  "sourceManifestSha256": "004ff039931dcddc3f4c0936b5e3f002f5c028aba47f25bd2f11fb6454f41ea0",
  "head": "176ea15b572c610e97f99a021ea94e2ba60637c7",
  "parent": "5214cf94bfd4df7b9da002775d65394c9c17b9d3",
  "sourceFullStableShaBlobMode": true,
  "gitTrackedManifestExact": true,
  "publicLinks": 108,
  "uniquePackages": 83,
  "uniquePackageBytes": 422152,
  "publicFullStable": true,
  "cfAndThreeShims": true,
  "pinnedNodeGitMetadata": true,
  "runnerBytes": 281151,
  "runnerSha256": "63c82cfd92ba8dbbd79045b26a92c3e6dbf43482e700abd290762b3476f30c21",
  "configBytes": 380456,
  "configSha256": "f2a843ed240aee1c628c39537e8db4a9ceafd94a5ebe4afe4147775e9973b8d9",
  "runtime": 0,
  "preflight": 0,
  "rootProbeCreate": 0,
  "oldPrivateOperations": 0
}

初回自前読解のkind symlink想定は正式manifest kind linkと異なり、AGENTS行で停止。SOURCE/helper変更0・private/rootprobe0。formal schema linkを読み直した。次の自前Vitest mode644仮定もnode-git-metadataで停止した。正式hash既固定43BのPUBLIC executable755を有限directmetadata/fullSHA確認し、自前仮定だけ補正。本precheckのSOURCE bytes/SHA/blob期待は更新していない。

独立diagnostic補正review受入後、existing --preflight logicalを別全inspect→ONE --supervise logicalだけ採用する。new memory root f82c613a/tmp/cache未probe。全旧private恒久NOOPS。実行normal/4case/native-proofの先取り0。
