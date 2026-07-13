// Automates a full release: bump version, push commit+tag, build the
// installer, publish it as a GitHub release, then un-draft the release
// (electron-builder always creates releases as drafts).
import { execSync } from "node:child_process";

const bumpType = process.argv[2] || "patch";

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...options }).trim();
}

function runInherit(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...options });
}

function main() {
  const tag = run(`npm version ${bumpType}`); // e.g. "v1.0.3"; also creates the commit + tag
  console.log(`\nNew version: ${tag}\n`);

  runInherit("git push");
  runInherit(`git push origin ${tag}`);

  const ghToken = run("gh auth token");

  runInherit("electron-builder --win nsis --publish always", {
    env: { ...process.env, GH_TOKEN: ghToken },
  });

  runInherit(`gh release edit ${tag} --draft=false`);

  console.log(`\nRelease ${tag} published.`);
}

main();
