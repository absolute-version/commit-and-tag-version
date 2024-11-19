#!/usr/bin/env node

/* istanbul ignore if */
if (process.version.match(/v(\d+)\./)[1] < 6) {
  console.error(
    'commit-and-tag-version: Node v6 or greater is required. `commit-and-tag-version` did not run.',
  );
} else {
  const standardVersion = (await import('../index.mjs')).default;
  const cmdParser = (await import('../command.mjs')).default;
  await standardVersion(cmdParser.argv).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
