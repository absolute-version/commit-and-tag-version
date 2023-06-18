type IgnoreMatcher = {
  negated: boolean[];
  rooted: boolean[];
  matchers: RegExp[];
  shouldIgnore: (arg0: string) => boolean;
  delimiter: string;
}

declare module 'dotgitignore' {
  interface DotGitIgnoreInstance {
    matcher: IgnoreMatcher;
    ignore(name: string): boolean;
  }
  function DotGitIgnore(opts?: import('find-up').Options): DotGitIgnoreInstance;
  export default DotGitIgnore;
}

declare type RuntimeConfig = {
    releaseAs: string;
    path: string | undefined;
    lernaPackage: string | undefined;
    dryRun: boolean;

    scripts: { [x: string]: string };
    preset: string;
    silent: boolean;
    skip: {
      tag: boolean;
      changelog: boolean;
      commit: boolean;
      bump: boolean;
    };
    tagForce: boolean;
    sign: boolean;
    tagPrefix: string;
    releaseCommitMessageFormat: string;
    npmPublishHint: string;
    prerelease: string;
    verify: boolean;
    n: boolean;
    infile: string;
    commitAll: boolean;
    releaseCount: number;
    header: string;
    verbose: boolean;
  };
  
