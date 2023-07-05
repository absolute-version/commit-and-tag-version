/* global describe it beforeEach afterEach */

import shell from "shelljs";
import * as fs from "node:fs";
import { Readable } from "stream";
import mockery from "mockery";
import stdMocks from "std-mocks";
import { expect } from "chai";

require("chai").should();

function exec() {
  const cli = require("../command");
  const opt = cli.parse("commit-and-tag-version");
  opt.skip = { commit: true, tag: true };
  return require("../index")(opt);
}

// These types are all guesses to get mocha working
// TODO: Fix these types and remove the start and end comments
type Preset = {
  issueUrlFormat: string;
};

type HasPreset = {
  preset: Preset;
};

type ChangelogFn = (props: HasPreset) => string;

type MockArg = {
  bump?: string | Function | Error;
  changelog?: ChangelogFn | ChangelogFn[];
  tags?: string[] | Error;
};

type BumpCallback = (n: Error | null, s?: { releaseType?: string }) => void;

type TagsCallback = (n: Error | null, s?: string[]) => void;

type Options = unknown;
// END GUESSES

/**
 * Mock external conventional-changelog modules
 *
 * Mocks should be unregistered in test cleanup by calling unmock()
 *
 * bump?: 'major' | 'minor' | 'patch' | Error | (opt, cb) => { cb(err) | cb(null, { releaseType }) }
 * changelog?: string | Error | Array<string | Error | (opt) => string | null>
 * tags?: string[] | Error
 */
function mock({ bump, changelog, tags }: MockArg = {}) {
  mockery.enable({ warnOnUnregistered: false, useCleanCache: true });

  mockery.registerMock(
    "conventional-recommended-bump",
    function (opt: Options, cb: BumpCallback) {
      if (typeof bump === "function") bump(opt, cb);
      else if (bump instanceof Error) cb(bump);
      else cb(null, bump ? { releaseType: bump } : {});
    }
  );

  if (!Array.isArray(changelog)) changelog = changelog ? [changelog] : [];

  mockery.registerMock(
    "conventional-changelog",
    (opt: HasPreset) =>
      new Readable({
        read(_size) {
          const next = (changelog as ChangelogFn[]).shift();
          if (next instanceof Error) {
            this.destroy(next);
          } else if (typeof next === "function") {
            this.push(next(opt));
          } else {
            this.push(next ? Buffer.from(next, "utf8") : null);
          }
        },
      })
  );

  mockery.registerMock("git-semver-tags", function (cb: TagsCallback) {
    if (tags instanceof Error) cb(tags);
    // I don't think this is right, but I didn't want to change the behaviour
    // @ts-ignore
    else cb(null, tags | []);
  });

  stdMocks.use();
  return () => stdMocks.flush();
}

describe("config files", () => {
  beforeEach(function () {
    shell.rm("-rf", "tmp");
    shell.config.silent = true;
    shell.mkdir("tmp");
    shell.cd("tmp");
    fs.writeFileSync(
      "package.json",
      JSON.stringify({ version: "1.0.0" }),
      "utf-8"
    );
  });

  afterEach(function () {
    shell.cd("../");
    shell.rm("-rf", "tmp");

    mockery.deregisterAll();
    mockery.disable();
    stdMocks.restore();

    // push out prints from the Mocha reporter
    const { stdout } = stdMocks.flush();
    for (const str of stdout) {
      if (str.startsWith(" ")) process.stdout.write(str);
    }
  });

  const configKeys = ["commit-and-tag-version", "standard-version"];

  configKeys.forEach((configKey) => {
    it(`reads config from package.json key '${configKey}'`, async function () {
      const issueUrlFormat =
        "https://commit-and-tag-version.company.net/browse/{{id}}";
      mock({
        bump: "minor",
        changelog: ({ preset }) => preset.issueUrlFormat,
      });
      const pkg = {
        version: "1.0.0",
        repository: { url: "git+https://company@scm.org/office/app.git" },
        [configKey]: { issueUrlFormat },
      };
      fs.writeFileSync("package.json", JSON.stringify(pkg), "utf-8");

      await exec();
      const content = fs.readFileSync("CHANGELOG.md", "utf-8");
      expect(content).should.include(issueUrlFormat);
    });
  });

  it("reads config from .versionrc", async function () {
    const issueUrlFormat = "http://www.foo.com/{{id}}";
    const changelog: ChangelogFn = ({ preset }) => preset.issueUrlFormat;
    mock({ bump: "minor", changelog });
    fs.writeFileSync(".versionrc", JSON.stringify({ issueUrlFormat }), "utf-8");

    await exec();
    const content = fs.readFileSync("CHANGELOG.md", "utf-8");
    content.should.include(issueUrlFormat);
  });

  it("reads config from .versionrc.json", async function () {
    const issueUrlFormat = "http://www.foo.com/{{id}}";
    const changelog: ChangelogFn = ({ preset }) => preset.issueUrlFormat;
    mock({ bump: "minor", changelog });
    fs.writeFileSync(
      ".versionrc.json",
      JSON.stringify({ issueUrlFormat }),
      "utf-8"
    );

    await exec();
    const content = fs.readFileSync("CHANGELOG.md", "utf-8");
    content.should.include(issueUrlFormat);
  });

  it("evaluates a config-function from .versionrc.js", async function () {
    const issueUrlFormat = "http://www.foo.com/{{id}}";
    const src = `module.exports = function() { return ${JSON.stringify({
      issueUrlFormat,
    })} }`;
    const changelog: ChangelogFn = ({ preset }) => preset.issueUrlFormat;
    mock({ bump: "minor", changelog });
    fs.writeFileSync(".versionrc.js", src, "utf-8");

    await exec();
    const content = fs.readFileSync("CHANGELOG.md", "utf-8");
    content.should.include(issueUrlFormat);
  });

  it("evaluates a config-object from .versionrc.js", async function () {
    const issueUrlFormat = "http://www.foo.com/{{id}}";
    const src = `module.exports = ${JSON.stringify({ issueUrlFormat })}`;
    const changelog: ChangelogFn = ({ preset }) => preset.issueUrlFormat;
    mock({ bump: "minor", changelog });
    fs.writeFileSync(".versionrc.js", src, "utf-8");

    await exec();
    const content = fs.readFileSync("CHANGELOG.md", "utf-8");
    content.should.include(issueUrlFormat);
  });

  it("throws an error when a non-object is returned from .versionrc.js", async function () {
    mock({ bump: "minor" });
    fs.writeFileSync(".versionrc.js", "module.exports = 3", "utf-8");
    try {
      await exec();
      /* istanbul ignore next */
      throw new Error("Unexpected success");
    } catch (error) {
      expect((error as Error).message).should.match(/Invalid configuration/);
    }
  });
});
