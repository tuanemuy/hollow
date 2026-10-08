# 一時ディレクトリの削除前調査

3ディレクトリとも旧 production DB の online backup を含む。合成 fixture だけのディレクトリではなく、「D01 の旧データを含んでいないこと」という削除条件を満たしたとは判断できない。3ディレクトリをそのまま保全し、削除していない。

調査日は2026-10-09。対象は `archive/main-ac0894a-rebaseline-20261008/reviews/` 内の指定3ディレクトリに限定した。DB・WAL・SHM本体と旧 objects・D01 本体は開いていない。旧環境への接続、helper の実行、DB照会、ハッシュ照合は行っていない。以下の旧報告は今回の受け入れ根拠ではなく、保存物の由来を調べるために局所参照した。

## ディレクトリごとの判定

| ディレクトリ | 保存されているDB系ファイル | 由来と判定 | 扱い |
| --- | --- | --- | --- |
| `p3b-1-independent.QtYhXV` | `baseline.db` と WAL/SHM | 局所報告は開始前の online backup と、旧630 notes・68 assets・992 revisions・123 snapshotsの保持を記載。`identity.mjs` は旧 production DB と `baseline.db` を比較する。旧DB由来のデータを含むため、D01を含まないとは確認できない。 | 全体を保全 |
| `p3b-2-independent.qGd0HC` | `baseline.db` と WAL/SHM、`final.db`、`charge-1789047566265.db`、`charge-1789048628806.db` | 局所報告は baseline/final の online backup と、旧43表の auth/invite/WS/note/revision/pin/claim を保持したことを記載。保存helperは旧 production DBからfinalをbackupし、容量検証用copyもbaselineからDB全体をbackupする。D01を含まないとは確認できない。 | 全体を保全 |
| `p3b-2-v1-independent.ZLdUG3` | `baseline.db` と WAL/SHM、`final.db` と WAL/SHM、`charge-1789049974533.db`、`charge-1789050230180.db` | 局所報告は baseline/final の online backup と旧43表全旧列の保持を記載。`identity.mjs` は旧 production DBを参照し、容量検証用copyはbaselineからDB全体をbackupする。D01を含まないとは確認できない。 | 全体を保全 |

3ディレクトリにサブディレクトリとシンボリックリンクはなく、objects用ディレクトリのコピーは観測しなかった。ただし、旧DBの行を保持するbackupがあるため、これは旧データ不在の証明にならない。D01の具体的な行が含まれるかは、DB本体を読む許可のない今回の範囲では未確認。

手書きHTML/SVGや画像fixture、独立テストの合成アカウントも混在する。局所報告の「synthetic」はこれら入力fixtureを指しており、保存DB全体が合成であることを示していない。ファイルごとの削除可否は調査していない。

## 今回のコマンドと結果

`ls -ld` に3つの対象ディレクトリを指定して実行した。3つとも通常のディレクトリとして存在した。

次のメタデータ確認を実行した。ファイル名と種類だけを調べ、ファイル本体は開かない。

```python
import os
from pathlib import Path

base = Path('.goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews')
for name in ['p3b-1-independent.QtYhXV', 'p3b-2-independent.qGd0HC',
             'p3b-2-v1-independent.ZLdUG3']:
    root = base / name
    files, links, dirs = [], [], []
    for parent, children, names in os.walk(root, followlinks=False):
        dirs.extend(str((Path(parent) / x).relative_to(root)) for x in children)
        for x in children + names:
            p = Path(parent) / x
            if p.is_symlink():
                links.append(str(p.relative_to(root)))
        files.extend(str((Path(parent) / x).relative_to(root)) for x in names
                     if not (Path(parent) / x).is_symlink())
    print(name, 'files=' + str(len(files)), 'subdirs=' + str(len(dirs)),
          'symlinks=' + str(len(links)))
    print('DB family:', ', '.join(sorted(x for x in files if '.db' in x)))
```

結果は順に34 / 45 / 39ファイル、各サブディレクトリ0、シンボリックリンク0。DB系ファイルは上表のとおりだった。

局所報告を次の範囲だけ読んだ。

```sh
sed -n '126,142p' .goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/P3b-1.md
sed -n '128,149p' .goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/P3b-2.md
sed -n '65,78p' .goal-implement/archive/main-ac0894a-rebaseline-20261008/reviews/P3b-2-V1.md
```

結果は各行のonline backupと旧データ保持の記録。参照箇所は [P3b-1.md](archive/main-ac0894a-rebaseline-20261008/reviews/P3b-1.md#保全未確認引継ぎ)、[P3b-2.md](archive/main-ac0894a-rebaseline-20261008/reviews/P3b-2.md#保全と引継ぎ)、[P3b-2-V1.md](archive/main-ac0894a-rebaseline-20261008/reviews/P3b-2-V1.md#保全と停止)。当時の保全結果そのものを今回再検証したとは主張しない。

Pythonで対象内の `identity.mjs`、`charges.mts`、保存用 `finish.mjs` / `finalize.mjs` / `capture.mjs` と `independent.integration.test.ts` の静的ソースに限定し、DB参照・backup処理・合成fixture生成箇所を読んだ。全3つの `identity.mjs` が旧production DB `/tmp/hollow-p2b.dAfzgS/app.db` と `baseline.db` を参照した。P3b-2の `finalize.mjs` はその旧DBを `final.db` へbackupする記述を持ち、P3b-2/V1の `charges.mts` は既定入力 `baseline.db` を `charge-<時刻>.db` へbackupする記述を持った。これらは静的ソースの観測であり、sqlite3やhelperは実行していない。

アカウント用helperには過去のcredential incidentに関する局所記録があるため、`signin.cjs` / `setup.cjs` の値は読まず、秘密値を報告に転載していない。archive全体の内容読み取りは行っていない。

## 残る判断

今回の条件付き削除承認では3ディレクトリを削除しない。D01を含まないことの確認には保護対象DB本体の読み取りが必要になり得るが、それは今回の限定調査の範囲外。保全対象として扱ったままManagerへ引き継ぐ。
