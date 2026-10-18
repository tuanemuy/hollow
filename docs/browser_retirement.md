# 退会のローカル確認

`pnpm test:browser:retirement` は新規DB・objects・鍵と既存account/editing/sharing/jobsの合法fixtureを使い、製品HTTP/RSCとnative workersを起動します。実アカウント、Google、OpenRouter、SMTP、Driveへ接続・配送・課金はしません。音声は対象外です。

```sh
env -i HOME="$HOME" PATH="$PATH" LANG=en_US.UTF-8 nix develop
mkdir -m 700 -p "$HOME/.local/hwt/retirement-new"
export TMPDIR="$HOME/.local/hwt/retirement-new"
export TMP="$TMPDIR" TEMP="$TMPDIR"
pnpm install --frozen-lockfile
pnpm build
pnpm test:browser:retirement --root "$HOME/.local/share/hollow/retirement-new" --port 4341
```

checkout、未作成runtime root、短いpersistent TMPDIRを毎回新規にします。Node22.22.3/Unicode16.0とpnpm実行Nodeを確認し、稼働中checkoutを再buildしません。

`fixture.json` に合成アカウント・ノート・公開/限定URL・workspace・ファイルを記録します。`owner@editing.fixture.invalid` / `editor@editing.fixture.invalid` / `viewer@editing.fixture.invalid`、共通passwordは `local-editing-password-123`。ownerのworkspaceにはeditorを後継ownerとして通常application/UoWで登録済みです。唯一ownerの拒否は、設定画面で自分の新規workspaceを作成した状態で確認し、他のownerを付与するか削除してから退会します。

1. プロフィール設定の最下部で不可逆・個人情報/個人ノート/ファイル/タグ/連携の回収とworkspace/Driveファイル保持の説明を確認します。メール不一致は送信を抑止します。
2. 個人公開/限定URLを読み、個人ノートをworkspaceへ移動します。OpenRouter連携はローカル同意画面だけを代替し、exchange/inspectには製品NodeProvider・native HTTPS transport・owned runtime・専用TLSを使います。通信先は所有loopbackだけです。自己生成CA/鍵とDB-UoWを同moduleでcomposeし、所有guardや公開DI/HTTP契約を変えません。
3. `jobs-slow-a.txt` などの非音声原本を通常uploadし、ticker/履歴の実行中を確認して本人メールで退会します。即時サインアウト・別端末の失効・個人URL拒否を確認します。後継ownerでworkspaceの残存本文、移動済みノート、著者「退会した利用者」を確認します。
4. Drive は専用保存先へ合法な連携状態を seed します。移動済み原本のバックアップを通常画面から実行し、provider 側の保存済みファイルを退会後も保持します。退会専用構成は製品 `acquireDriveRuntime` と同moduleの `NodeDriveExecution`・`NodeDriveBackupSource` を使い、実際の閉鎖証跡のDB ACKと再読の後に回収します。
5. 新規専用rootのDB/objectsで取消・native closed/ACK後の回収を観測します。未知の所有やlegacy資格情報は終了成功へ読み替えず `waiting-owner` を保持します。元providerのDriveファイルは削除しません。ZIP/Driveの各取消・原本保持・閉鎖未証明拒否は対応するrepository integrationでも確認します。

終了は自分のactual server PIDへSIGTERM/SIGINTを送り、native hook/drainのexit0、worker/参照/provider/listener/browserの終了を待ちます。実サービスの資格情報や既存秘密envを使いません。
