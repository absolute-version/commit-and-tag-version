import util from 'util';
import chalk from 'chalk';
import figures from 'figures';

export default function (argv, msg, args, figure) {
  const defaultFigure = argv.dryRun
    ? chalk.yellow(figures.tick)
    : chalk.green(figures.tick);
  if (!argv.silent) {
    console.info(
      (figure || defaultFigure) +
      ' ' +
      util.format.apply(
        util,
        [msg].concat(
          args.map(function (arg) {
            return chalk.bold(arg);
          }),
        ),
      ),
    );
  }
}
