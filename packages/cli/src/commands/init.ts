import crypto from 'crypto';
import chalk from 'chalk';
import fs from 'fs-extra';
import { flags } from '@oclif/command';
import { prompt } from 'inquirer';
import { Collection, Meta, SCHEMA_VERSION } from '@tuture/core';
import { collectionPath, saveCollection } from '@tuture/local-server';

import logger from '../utils/logger';
import BaseCommand from '../base';
import { makeSteps, removeTutureSuite } from '../utils';
import { selectRemotes } from '../utils/prompt';
import {
  git,
  inferGithubField,
  appendGitHook,
  appendGitignore,
} from '../utils/git';

export default class Init extends BaseCommand {
  static description = 'Initialize a tuture tutorial';

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  async promptInitGit() {
    const response = await prompt<{
      answer: boolean;
    }>([
      {
        name: 'answer',
        type: 'confirm',
        message:
          'You are not in a Git repository, do you want to initialize one?',
        default: false,
      },
    ]);

    if (!response.answer) {
      this.exit(0);
    } else {
      await git.init();
      logger.log('success', 'Git repository is initialized!');
    }
  }

  async run() {
    if (fs.existsSync(collectionPath)) {
      logger.log('success', 'Tuture tutorial has already been initialized!');
      this.exit(0);
    }

    if (!(await git.checkIsRepo())) {
      await this.promptInitGit();
    }

    const meta = {
      name: 'My Awesome Tutorial',
      id: crypto.randomBytes(16).toString('hex'),
    };

    try {
      const steps = await makeSteps(this.userConfig.ignoredFiles);

      steps.forEach((step) => {
        step.articleId = meta.id;
      });

      const collection: Collection = {
        ...meta,
        created: new Date(),
        articles: [meta],
        steps,
      };

      const github = await inferGithubField();
      if (github) {
        logger.log(
          'info',
          `Inferred github repository: ${chalk.underline(
            github,
          )}. Feel free to revise or delete it.`,
        );
        collection.github = github;
      }

      const remotes = await git.getRemotes(true);

      if (remotes.length > 0) {
        collection.remotes = await selectRemotes(remotes);
      }

      collection.version = SCHEMA_VERSION;

      saveCollection(collection);
      appendGitignore();
      appendGitHook();

      logger.log('success', 'Tuture tutorial has been initialized!');
    } catch (err) {
      await removeTutureSuite();
      logger.log({
        level: 'error',
        message: err.message,
        error: err,
      });
      this.exit(1);
    }
  }
}