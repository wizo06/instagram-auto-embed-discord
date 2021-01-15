const path = require('path');
const discord = require('discord.js');
const puppeteer = require('puppeteer');
const logger = require('logger');
require('toml-require').install({ toml: require('toml') });

const CONFIG = require(path.join(process.cwd(), 'config/user_config.toml'));

const BOT = new discord.Client({ retryLimit: Infinity });

const loginIfNeeded = (page) => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug('Navigating to @instagram');
      await page.goto('https://www.instagram.com/instagram/');
      await page.waitForTimeout(CONFIG.instagram.navigationTimeout);

      let link = await page.url();
      if (link.match(/https:\/\/www\.instagram\.com\/accounts\/login/)) {
        logger.debug('Landed on login page');
        await page.type('input[name="username"]', CONFIG.instagram.username);
        await page.type('input[name="password"]', CONFIG.instagram.password);
        await page.click('button.L3NKy');
        await page.waitForTimeout(CONFIG.instagram.navigationTimeout);

        link = await page.url();
        if (link.match(/https:\/\/www\.instagram\.com\/accounts\/onetap\//)) {
          logger.debug('Landed on OneTap page');
          await page.click('button.yWX7d');
          await page.waitForTimeout(CONFIG.instagram.navigationTimeout);
        }
        logger.debug('Login successful');
      }
      else {
        logger.debug('Login not needed');
      }

      resolve();
    }
    catch (e) {
      logger.error('Login failed');
      resolve();
    }
  });
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 800, height: 1440 } });
  const page = await browser.newPage();
  await loginIfNeeded(page);
  await page.close();
  logger.debug('Puppeteer launched successfully for instagram auto embed.');

  BOT.on('message', async msg => {
    if (msg.content.match(/https:\/\/www\.instagram\.com\/.+/)) {
      require(path.join(process.cwd(), `src/autoEmbed/instagram.js`)).run(msg, browser);
    }
  });

  BOT.on('error', err => {
    logger.error(err.message);
  });

  BOT.on('ready', async () => {
    logger.info(`Logged in as ${BOT.user.tag}`);
    logger.info(`**********************************************`);
  });

  BOT.login(CONFIG.discordBOTToken).catch(e => logger.error(e));
})();