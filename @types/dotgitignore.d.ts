declare module 'dotgitignore' {
  interface Options {
    readonly cwd?: URL | string;
    readonly type?: 'file' | 'directory';
    readonly allowSymlinks?: boolean;
  }
  interface DotGitIgnoreInstance {
    ignore(name: string): boolean;
  }
  function DotGitIgnore(opts?: Options): DotGitIgnoreInstance;
  export default DotGitIgnore;
}
