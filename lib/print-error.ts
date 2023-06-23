import chalk from 'chalk';
import { Config } from './opts/types';

interface PrintErrorOptions {
  level?: ('error' | 'warn' | 'info' | 'debug' | 'log');
  color?:
    | 'black'
    | 'red'
    | 'green'
    | 'yellow'
    | 'blue'
    | 'magenta'
    | 'cyan'
    | 'white'
    | 'gray'
    | 'grey'
    | 'blackBright'
    | 'redBright'
    | 'greenBright'
    | 'yellowBright'
    | 'blueBright'
    | 'magentaBright'
    | 'cyanBright'
    | 'whiteBright';
}

export default function printError(config: Config, msg: string, opts?: PrintErrorOptions) {
  if (!config.silent) {
    console[opts?.level || 'error'](chalk[opts?.color || 'red'](msg));
  }
}
