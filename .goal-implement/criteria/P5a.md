# P5a: Google認証・ログイン方法管理

項目状態の正本: [plan.md](../plan.md#p5a-google認証ログイン方法管理)。以下は固定IDごとの完了条件と検証根拠。

## P5a-A

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5a-A | R01/R12 / AC-03/06・CLAUDE.md・design認証保存 | password-only/Google-only/bothと現在認証版を内向き型/専用CAS/UoWで保存し、方法0・古いaccount保存によるcredential復活を防ぐ。追加移行clone/freshで既存hash/session固定期限・全旧列/FK/trigger/所有を保持し、偽passwordを作らない （[P5a独立受入](../reviews/P5a.md)） |

## P5a-B

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5a-B | R01 / AC-03・利用者追加本人確認決定 | 検証済issuer/subを先に解決し、verified新規/既存authoritative/第三者追加proof/既存unverifiedを正しく分岐する。email変更・同email/sub競合で別accountへ付替えず、未確認claimsやproof前の既存link/sessionを発行しない （[P5a独立受入](../reviews/P5a.md)） |

## P5a-C

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5a-C | R01/R12 / AC-03/06・designOAuth/ABA/秘密 | login/link/reauthを区別しstate/nonce/S256・browser/actor/authVersion/固定期限/一回性・許可戻り先を照合。外部交換/JWKSは有限Tx外、応答不明を自動再交換せず、署名/issuer/aud/azp/nonce/期限を検証。server fenceでABA/遅いcookie認証復活を防ぎ、秘密をDTO/URL履歴/logへ残さない （[S5a fence/dispatch局所独立受入](../reviews/P5c-1-s5a.md)。不変更の交換/JWKS/browser等は既根拠を維持） |

## P5a-D

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5a-D | R01 / AC-02/03・追加proof決定・design目的分離 | 既存password又は新google-link mailだけを元attempt/sub/account/email/authVersion/browserへ束縛し、proof消費/link/sessionを現在条件の同Txで確定。GETは消費せず別browserで成立させない。通常AC-02の24h/別browser確認と目的を混ぜず、再送で親期限を延ばさない （[P5a独立受入](../reviews/P5a.md)） |

## P5a-E

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5a-E | R01 / AC-04〜06/08・designsession/最終方法 | Google-onlyへのpassword追加は新同sub再認可proof、変更は現password必須。方法追加/解除と同時二解除の最終方法保護、reset1h一回性・Google-only案内、password変更の他session失効/current固定期限保持、resetの全旧session失効、他端末signoutを実DB/競合対で確認。Google解除はDriveや全Hollow session解除を兼ねない （[P5a独立受入](../reviews/P5a.md)） |

## P5a-F

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5a-F | R01/R12 / AC-01〜06/08・WS-04/05・CLAUDE.md UI | 同bundleでGoogle入口/安全callback/追加proof/再設定/方法管理/他端末signoutのpending/error/明示再開・390keyboardを契約実UIで接続。元招待selector/continuationを保ち参加は既存明示操作だけ。dirty/actor/context/ACK境界を維持し、Google未構成を成功表示せず既存password認証を継続する （[P5a独立受入](../reviews/P5a.md)） |

## P5a-G

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5a-G | R01/R12 / design外部検証/境界/濫用 | ローカル代替と実adapterの契約試験でclaims偽造/競合/期限/一回性/ABA/応答不明/遅い結果・有限HTTP/秘密保管/prune/送信照合rateを確認。Google実認証と実メールに必要な設定/承認/条件付き手順を残し、fake成功を実接続完了にしない （[Drive追加の局所独立受入](../reviews/P5c-1-s2-fix.md)、不変更の旧範囲は既根拠維持） |

## P5a-H

| ID | 出どころ | 完了条件・検証方法 |
| --- | --- | --- |
| P5a-H | R12 / CLAUDE.md・design保全/引継ぎ | 規定type/lint/format/unit/影響統合/buildと対象UI、既存認証/認可の実影響だけを検証。最新独立baselineから旧objects/列/FTS/容量/資格情報を保全し、専有自己fixture/秘密の安全な回収・固定commit/source/bundle/lock/最終保全・全停止を揃える。外部送信/費用/資格情報探索を無断で行わない （[P5a独立受入](../reviews/P5a.md)） （P5b-1実変更: OpenRouter attempt参照をauthBrowser.pruneへ追加したため、生存epoch/有限回収と保全の影響部分を再検証） （[P5b-1独立受入](../reviews/P5b-1.md)、固定870f84aの実影響範囲） |

## 検証報告への参照

- [P5a独立受入](../reviews/P5a.md)
- [S5a fence/dispatch局所独立受入](../reviews/P5c-1-s5a.md)
- [Drive追加の局所独立受入](../reviews/P5c-1-s2-fix.md)
- [P5b-1独立受入](../reviews/P5b-1.md)
