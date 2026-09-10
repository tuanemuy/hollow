export const fixtures = {
  normal:
    '<h2>見出し</h2><p>前<strong>太字</strong><em>斜体</em><u>線</u>後<br>続き</p><ul><li>一</li><li>二</li></ul><ol start="3"><li>三</li></ol><blockquote><p>引用</p></blockquote>',
  table:
    '<p>前</p><table class="grid"><thead data-kind="head"><tr><th>名前</th><th>値</th></tr></thead><tbody><tr><td>A</td><td>B</td></tr></tbody></table><p>後</p>',
  merged:
    '<table><tbody><tr><td rowspan="2">縦</td><td colspan="2">横</td></tr><tr><td>A</td><td>B</td></tr></tbody></table>',
  japaneseCRLF:
    "<p title='元属性'>日本語\r\n&#x65e5;&amp;本</p>\r\n<pre>\r\n一\r\n二</pre>",
  codeLinkMedia:
    '<pre><code class="language-js">const a = 1 &lt; 2;\r\n次</code></pre><p><a href="https://example.com/?a=1&amp;b=2" title="link">移動しない</a><code>x</code><img src="/api/notes/n/assets/a" alt="画像"><video src="https://example.com/a.mp4" controls></video></p>',
  unknown:
    '<style data-hollow-stylesheet="https://example.com/a.css">.tone{color:red}</style><p class="tone" style="color:blue" data-origin="forged">前<sup class="s" data-x="1">保持</sup><span class="tone" style="font-weight:bold" data-x="2">編集可</span>後</p><aside class="panel"><figure><img src="x"><figcaption>未知block</figcaption></figure></aside><p>末</p>',
  namespace:
    '<p>前<svg viewBox="0 0 10 10"><text>図</text></svg>後</p><math><mi>x</mi></math><p>末</p>',
  invalidNest:
    "<p>前</p><table><div>不適合</div><tr><td>A</td></tr></table><table><tr><td>通常</td></tr></table><p>後</p>",
  dangerous:
    '<style>body{display:none}</style><p class="x" style="position:fixed" onclick="alert(1)"><a href="javascript:alert(1)">link</a><img src="https://bad.invalid/x" onerror="alert(2)"></p><script>alert(3)</script>',
} as const;
