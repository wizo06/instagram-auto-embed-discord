const path = require('path');
const discord = require('discord.js');
const puppeteer = require('puppeteer-extra');
const logger = require('logger');
const fs = require('fs');
require('toml-require').install({ toml: require('toml') });

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const CONFIG = require(path.join(process.cwd(), 'config/user_config.toml'));
const cookiesPath = 'cookies.json';

const BOT = new discord.Client({ retryLimit: Infinity });


const loginIfNeeded = (page) => {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug('Navigating to @instagram');
      await page.goto('https://www.instagram.com/instagram/');
      await page.waitForTimeout(CONFIG.instagram.navigationTimeout);

      let link = await page.url();
      if (link.match(/https:\/\/(www\.)*instagram\.com\/accounts\/login/)) {
        logger.debug('Landed on login page');

        logger.debug('Input username');
        await page.type('input[name="username"]', CONFIG.instagram.username);
        logger.debug('Input password');
        await page.type('input[name="password"]', CONFIG.instagram.password);
        logger.debug('Click Login button');
        await page.click('button.L3NKy');
        await page.waitForTimeout(CONFIG.instagram.navigationTimeout);
        
        // logger.debug('Taking screenshot');
        // await page.screenshot({path: 'login.png'});

        link = await page.url();
        if (link.match(/https:\/\/(www\.)*instagram\.com\/accounts\/onetap\//)) {
          logger.debug('Landed on OneTap page');
          
          await page.click('button.yWX7d');
          await page.waitForTimeout(CONFIG.instagram.navigationTimeout);

          // logger.debug('Taking screenshot');
          // await page.screenshot({ path: 'onetap.png' });
        }
        logger.debug('Login successful');

        const cookiesObject = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookiesObject));
        logger.debug('Session has been saved to ' + cookiesPath);

        // logger.debug('Taking screenshot');
        // await page.screenshot({ path: 'loggedin.png' });
      }
      else {
        logger.debug('Login not needed');
      }

      resolve();
    }
    catch (e) {
      logger.error('Login failed');
      reject();
    }
  });
};

(async () => {
  logger.debug('Launching puppeteer.');
  const browser = await puppeteer.launch({ 
    args: ['--no-sandbox'],
    headless: true, 
    defaultViewport: { width: 800, height: 1440 },
  });
  const page = await browser.newPage();
  
  await loginIfNeeded(page).catch(e => process.exit(1));
  await page.close();
  logger.debug('Puppeteer launched successfully for instagram auto embed.');

  BOT.on('message', async msg => {
    if (msg.content.match(/https:\/\/(www\.)*instagram\.com\/.+/)) {
      logger.debug('Instagram link detected');
      require(path.join(process.cwd(), `src/autoEmbed/instagram.js`)).run(msg, browser);
    }
  });

  BOT.on('error', err => {
    logger.error(err.message);
  });

  BOT.on('ready', async () => {
    logger.info(`Logged in as ${BOT.user.tag}`);
    logger.info(`**********************************************`);

    // const channel = await BOT.channels.fetch(CONFIG.discord.channelID);
    // await channel.send({files: [
    //   {attachment: 'login.png'},
    //   {attachment: 'onetap.png'},
    //   {attachment: 'loggedin.png'}
    // ]});
  });

  BOT.login(CONFIG.discord.token).catch(e => logger.error(e));
})();