/* global describe it beforeEach afterEach */
import shell from "shelljs";
import * as fs from "node:fs";
import { Readable } from "stream";
import mockery from "mockery";
// import { use as stdMocksUse, flush as stdMocksFlush, restore } from "std-mocks";
import { expect } from "chai";
import { cmdParser } from '../command';
import { Release, Task } from '../lib/opts/types';
import cli from '../index';
import { getMergedConfig } from '../lib/opts';
import { getConfiguration } from '../lib/configuration';

function exec() {
  const argv = cmdParser.parseSync("commit-and-tag-version");
  argv.skip = [Task.commit, Task.tag];
  return getMergedConfig(argv);
}

function writePackageJson(configKey: string, issueUrlFormat: string) {
  const pkg = {
    version: "1.0.0",
    repository: { url: "git+https://company@scm.org/office/app.git" },
    [configKey]: { issueUrlFormat },
  };
  fs.writeFileSync("package.json", JSON.stringify(pkg), "utf-8");
}

describe("config files", () => {
  before(() => {
    shell.rm("-rf", "tmp");
    shell.config.silent = true;
    shell.mkdir("tmp");
    shell.cd("tmp");
  });

  after(() => {
    shell.cd("../");
    shell.rm("-rf", "tmp");
    shell.config.silent = false;
  });

  beforeEach(function () {
    shell.mkdir(this.currentTest!.id);
    shell.cd(this.currentTest!.id);
  });

  afterEach(function () {
    shell.cd("../");
    shell.rm("-rf", this.currentTest!.id);
  });

  const issueUrlFormat = "http://www.foo.com/{{id}}";
  const configObjString = `{ issueUrlFormat: "${issueUrlFormat}" }`;

  it(`reads config from package.json key 'commit-and-tag-version'`, async function () {
    writePackageJson('commit-and-tag-version', issueUrlFormat);

    const config = await exec();
    expect(config.issueUrlFormat).eq(issueUrlFormat);
  });

  it(`reads config from package.json key 'standard-version'`, async function () {
    writePackageJson('standard-version', issueUrlFormat);

    const config = await exec();
    expect(config.issueUrlFormat).eq(issueUrlFormat);
  });

  it("reads config from .versionrc", async function () {
    fs.writeFileSync(".versionrc", JSON.stringify({ issueUrlFormat }), "utf-8");

    const config = await exec();
    expect(config.issueUrlFormat).eq(issueUrlFormat);
  });

  it("reads config from .versionrc.json", async function () {
    fs.writeFileSync(".versionrc.json", JSON.stringify({ issueUrlFormat }), "utf-8");

    const config = await exec();
    expect(config.issueUrlFormat).eq(issueUrlFormat);
  });

  it("evaluates a config-function from .versionrc.js", async function () {
    const src = `module.exports = function() { return ${configObjString}; }`;
    fs.writeFileSync(".versionrc.js", src, "utf-8");

    const config = await exec();
    expect(config.issueUrlFormat).eq(issueUrlFormat);
  });

  it("evaluates a config-object from .versionrc.js", async function () {
    const src = `module.exports = ${configObjString}`;
    fs.writeFileSync(".versionrc.js", src, "utf-8");

    const config = await exec();
    expect(config.issueUrlFormat).eq(issueUrlFormat);
  });

  it("throws an error when a non-object is returned from .versionrc.js", async function () {
    fs.writeFileSync(".versionrc.js", "module.exports = 3", "utf-8");
    try {
      await getConfiguration();
      /* istanbul ignore next */
      throw new Error("Unexpected success");
    } catch (error: any) {
      console.log(error.message)
      expect(error.message).match(/Invalid configuration/);
    }
  });
});
