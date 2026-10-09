(() => {
  if (location.pathname !== "/integrations/drive/picker")
    throw Error("Open the dedicated Drive Picker page first");
  class DocsView {
    setIncludeFolders() {
      return this;
    }
    setSelectFolderEnabled() {
      return this;
    }
    setEnableDrives() {
      return this;
    }
    setMimeTypes() {
      return this;
    }
  }
  class PickerBuilder {
    setDeveloperKey() {
      return this;
    }
    setAppId() {
      return this;
    }
    setOAuthToken() {
      return this;
    }
    addView() {
      return this;
    }
    setCallback(callback) {
      this.callback = callback;
      return this;
    }
    build() {
      const picker = document.createElement("section");
      picker.setAttribute("role", "dialog");
      picker.setAttribute("aria-label", "ローカルPicker契約fixture");
      const title = document.createElement("h2");
      title.textContent = "ローカルの保存先を明示選択";
      const select = document.createElement("button");
      select.textContent = "ローカル原本バックアップを選択";
      const cancel = document.createElement("button");
      cancel.textContent = "Pickerをキャンセル";
      select.onclick = () =>
        this.callback({
          action: "picked",
          docs: [{ id: "local-backup-folder" }],
        });
      cancel.onclick = () => this.callback({ action: "cancel" });
      picker.append(title, select, cancel);
      return {
        setVisible: (visible) => {
          if (visible) document.body.append(picker);
          else picker.remove();
        },
        dispose: () => picker.remove(),
      };
    }
  }
  window.gapi = { load: (_name, options) => options.callback() };
  window.google = {
    picker: {
      DocsView,
      PickerBuilder,
      Action: { PICKED: "picked", CANCEL: "cancel" },
    },
  };
})();
