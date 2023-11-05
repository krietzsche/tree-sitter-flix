{pkgs ? import <nixpkgs>{}}: with pkgs;
mkShell {
  buildInputs = [
    nodejs-18_x
    nodejs-18_x.pkgs.pnpm 
    ccls
    tree-sitter
  ];
  TS_HOME="${tree-sitter}";
}
