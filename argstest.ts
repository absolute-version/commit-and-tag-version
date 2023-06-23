import argv from './command';
function main() {
  console.log((argv as any).bumpFiles);
}

console.dir(argv);
main();
