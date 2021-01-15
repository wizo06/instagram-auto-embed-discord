const logger = require('logger');
const discord = require('discord.js');
const path = require('path');

const CONFIG = require(path.join(process.cwd(), 'config/user_config.toml'));

const run = async (msg, browser) => {
  try {
    const link = msg.content.match(/https:\/\/www\.instagram\.com\/.+/)[0];
    if (link.match(/https:\/\/www\.instagram\.com\/p\/[\w\d]+/)) {
      // Post
      const POST_DIV = 'ltEKP';
      const IMG_CLASS = 'FFVAD';
      const VID_CLASS = 'tWeCl';
      const BUTTON_CLASS = '_6CZji';
      const PROFILE_PICTURE = '_6q-tv';
      const USERNAME_DIV = 'e1e1d';
      const DESCRIPTION_DIV = 'P9YgZ';

      logger.debug('Creating page');
      const page = await browser.newPage();
      logger.debug(`Navigating to post ${link}`);
      await page.goto(link);
      await page.waitForTimeout(CONFIG.instagram.navigationTimeout);

      const evalFunction = (IMG_CLASS, VID_CLASS, POST_DIV, PROFILE_PICTURE, USERNAME_DIV, DESCRIPTION_DIV) => {
        let temp = [];
        let imgCollection = document.getElementsByClassName(POST_DIV)[0].getElementsByClassName(IMG_CLASS);
        let videoCollection = document.getElementsByClassName(POST_DIV)[0].getElementsByClassName(VID_CLASS);

        const profilePictureURL = document.getElementsByClassName(PROFILE_PICTURE)[0].src;
        const username = document.getElementsByClassName(USERNAME_DIV)[0].innerText;
        let arr = [...document.getElementsByClassName(DESCRIPTION_DIV)[0].getElementsByTagName('span')];
        const postDescription = arr.pop().innerText;

        if (imgCollection.length !== 0) {
          for (img of imgCollection) {
            temp.push(img.src);
          }
        }

        if (videoCollection.length !== 0) {
          for (video of videoCollection) {
            temp.push(video.src);
          }
        }

        return { temp, profilePictureURL, username, postDescription };
      };

      let result = await page.evaluate(evalFunction, IMG_CLASS, VID_CLASS, POST_DIV, PROFILE_PICTURE, USERNAME_DIV, DESCRIPTION_DIV);

      let nextButton = await page.evaluate(BUTTON_CLASS => {
        return document.getElementsByClassName(BUTTON_CLASS).length;
      }, BUTTON_CLASS);

      while (nextButton) {
        await page.click(`button.${BUTTON_CLASS}`);
        await page.waitForTimeout(CONFIG.instagram.navigationTimeout);

        let moreResult = await page.evaluate(evalFunction, IMG_CLASS, VID_CLASS, POST_DIV, PROFILE_PICTURE, USERNAME_DIV, DESCRIPTION_DIV);

        // Concat
        result.temp = [...result.temp, ...moreResult.temp];

        nextButton = await page.evaluate(BUTTON_CLASS => {
          return document.getElementsByClassName(BUTTON_CLASS).length;
        }, BUTTON_CLASS);
      }

      logger.debug('Closing page');
      await page.close();

      // Dedupe
      result.temp = [...new Set(result.temp)];

      const embeds = [];
      for (const picture of result.temp) {
        embeds.push(new discord.MessageEmbed()
          .setColor('#E1306C')
          .setURL(`https://www.instagram.com/${result.username}/`)
          .setAuthor(result.username, result.profilePictureURL, `https://www.instagram.com/${result.username}/`)
          .setDescription(result.postDescription)
          .setImage(picture)
          .setFooter(`Instagram | ${result.temp.length} picture(s)`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
        );
      }

      const webhook = await msg.channel.createWebhook('Instagram Auto Embed');
      await webhook.send({ embeds });
      await webhook.delete();
    }
    else if (link.match(/https:\/\/www\.instagram\.com\/.+\/$/)) {
      // Profile
      const PROFILE_DIV = 'vtbgv ';
      const PROFILE_PICTURE = '_6q-tv';
      const DESCRIPTION_DIV = '-vDIg';
      const USERNAME_CLASS = '_7UhW9';

      logger.debug('Creating page');
      const page = await browser.newPage();
      logger.debug(`Navigating to post ${link}`);
      await page.goto(link);
      await page.waitForTimeout(CONFIG.instagram.navigationTimeout);

      const evalFunction = (PROFILE_DIV, PROFILE_PICTURE, DESCRIPTION_DIV, USERNAME_CLASS) => {
        const profilePictureURL = document.getElementsByClassName(PROFILE_DIV)[0].getElementsByClassName(PROFILE_PICTURE)[0].src;
        const username = document.getElementsByClassName(USERNAME_CLASS)[0].innerText;
        let description = '';
        const descriptionHTMlElement = document.getElementsByClassName(DESCRIPTION_DIV)[0].getElementsByTagName('span')[0];
        if (descriptionHTMlElement) description = descriptionHTMlElement.innerText;

        return { profilePictureURL, username, description };
      };

      let { profilePictureURL, username, description } = await page.evaluate(evalFunction, PROFILE_DIV, PROFILE_PICTURE, DESCRIPTION_DIV, USERNAME_CLASS);

      logger.debug('Closing page');
      await page.close();

      const embeds = [
        new discord.MessageEmbed()
          .setColor('#E1306C')
          .setThumbnail(profilePictureURL)
          .setTitle(username)
          .setURL(`https://www.instagram.com/${username}/`)
          .setDescription(description)
          .setFooter('Instagram', 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
      ];

      const webhook = await msg.channel.createWebhook('Instagram Auto Embed');
      await webhook.send({ embeds });
      await webhook.delete();
    }
    else if (link.match(/https:\/\/www\.instagram\.com\/stories\/[\w\d]+\/\d+/)) {
      // Stories
      console.log('stories')
    }
  }
  catch (e) {
    logger.error(e);
  }
};

module.exports = {
  run
}
