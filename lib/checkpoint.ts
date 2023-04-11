import chalk from 'chalk';
import figures from 'figures';
import util from 'util';
import { Config } from './opts/types';

export default function checkpoint(config: Config, msg: string, args: string[], figure?: string) {
  const defaultFigure = config.dryRun ? chalk.yellow(figures.tick) : chalk.green(figures.tick)
  if (!config.silent) {
    const message = util.format.apply(util, [msg].concat(args.map((arg) => chalk.bold(arg))));
    console.info(`${figure || defaultFigure} ${message}`);
  }
}
