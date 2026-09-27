# ZIP dependencies

The Node ZIP writer uses the public `ZipArchive` API from `archiver`, with STORE compression. The application does not import dependency internals. Exact resolved versions and integrity values are recorded in `pnpm-lock.yaml`.

| Package | Version | Role | License |
| --- | --- | --- | --- |
| archiver | 8.0.0 | Direct runtime dependency; ZIP writer | MIT |
| @types/archiver | 8.0.0 | Direct development dependency; public TypeScript declarations | MIT |
| zip-stream | 7.0.5 | Transitive ZIP stream implementation | MIT |
| compress-commons | 7.0.1 | Transitive archive serialization | MIT |
| crc32-stream | 7.0.1 | Transitive entry checksums | MIT |

Changing these versions requires rechecking STORE output bounds, entry bytes and order, backpressure, cancellation, and native source/sink closure. Archive finalization alone is not evidence that application-owned resources have closed. The deployment and retention contracts are documented in [Node runtime](runtime_node.md#html-and-markdown-zip-jobs).

The notices below accompany these components. Their installed packages retain the upstream license files; distribution must preserve the licenses of all bundled dependencies as well.

## Copyright notices

- archiver: Copyright (c) 2012-2014 Chris Talkington, contributors.
- @types/archiver: Copyright (c) Microsoft Corporation.
- zip-stream, compress-commons, crc32-stream: Copyright (c) 2014 Chris Talkington, contributors.

## MIT license

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
