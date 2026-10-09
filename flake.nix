{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
  };

  outputs =
    {
      self,
      nixpkgs,
      systems,
    }:
    let
      mapSupportedSystems = nixpkgs.lib.genAttrs (import systems);
      forEachSupportedSystem = f: mapSupportedSystems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forEachSupportedSystem (pkgs: {
        default =
          let
            node = assert pkgs.nodejs_22.version == "22.22.3"; pkgs.nodejs_22;
          in
          pkgs.mkShell {
            buildInputs = with pkgs; [
              biome
              node
              (pnpm.override { nodejs = node; })
              tailwindcss-language-server
              vtsls
            ];
          };
      });
    };
}
