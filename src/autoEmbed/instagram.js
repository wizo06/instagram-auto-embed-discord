const logger = require('logger');
const discord = require('discord.js');
const path = require('path');
const fetch = require('node-fetch');

const CONFIG = require(path.join(process.cwd(), 'config/user_config.toml'));

const isPrivate = (page) => {
  return new Promise(async (resolve, reject) => {
    try {
      let isPrivate = await page.evaluate('window._sharedData.entry_data.ProfilePage[0].graphql.user.is_private');
      if (isPrivate) {
        logger.debug('Profile is private');
        resolve(true);
      }
      else {
        logger.debug('Profile is public');
        resolve(false);
      }
    }
    catch (e) {
      logger.debug('Error checking for privacy of profile');
      resolve(false);
    }
  });
};

const editMessage = (webhook, msg, embeds) => {
  return new Promise(async (resolve, reject) => {
    const body = { embeds };

    await fetch(`https://discord.com/api/webhooks/${webhook.id}/${webhook.token}/messages/${msg.id}`, {
      method: 'patch',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });

    resolve();
  });

};

const run = async (msg, browser) => {
  const initEmbed = [new discord.MessageEmbed()
    .setColor('#E1306C')
    .setTitle('Scraping...')
    .setFooter(`Instagram`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
  ];

  // const webhook = await msg.channel.createWebhook('Instagram Auto Embed');
  // const sentMessage = await webhook.send({ embeds: initEmbed });

  const sentMessage = await msg.channel.send({ embed: initEmbed[0] });
  
  try {
    const link = msg.content.match(/https:\/\/(www\.)*instagram\.com\/.+/)[0];
    if (link.match(/https:\/\/(www\.)*instagram\.com\/p\/[\w\d]+/)) {
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

      if (await isPrivate(page)) {
        logger.debug('User is private. Closing page.');
        await page.close();
        const errorEmbed = [new discord.MessageEmbed()
          .setColor('#E1306C')
          .setTitle('Profile is private')
          .setFooter(`Instagram`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
        ];

        await sentMessage.edit({ embed: errorEmbed[0] });
        return;
      }

      const evalFunction = (IMG_CLASS, VID_CLASS, POST_DIV, PROFILE_PICTURE, USERNAME_DIV, DESCRIPTION_DIV) => {
        let temp = [];
        let imgCollection = document.getElementsByClassName(POST_DIV)[0].getElementsByClassName(IMG_CLASS);
        let videoCollection = document.getElementsByClassName(POST_DIV)[0].getElementsByClassName(VID_CLASS);

        const profilePictureURL = document.getElementsByClassName(PROFILE_PICTURE)[0].src;
        const username = document.getElementsByClassName(USERNAME_DIV)[0].getElementsByTagName('a')[0].innerText;

        let postDescription = '';
        const descriptionElement = document.getElementsByClassName(DESCRIPTION_DIV)[0];
        if (descriptionElement) {
          const arr = [...descriptionElement.getElementsByTagName('span')];
          postDescription = arr.pop().innerText;
        }

        if (imgCollection.length !== 0) {
          for (img of imgCollection) {
            temp.push(img.src);
          }
        }

        if (videoCollection.length !== 0) {
          for (video of videoCollection) {
            temp.push(video.poster);
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
        await page.waitForTimeout(500);

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
          .setFooter(`Instagram | ${result.temp.length} picture(s) and/or video(s)`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
        );
      }

      // await editMessage(webhook, sentMessage, embeds);
      // await webhook.delete();
      await sentMessage.edit({ embed: embeds[0] });
    }
    else if (link.match(/https:\/\/(www\.)*instagram\.com\/stories\/[\w\d]+\/\d+/)) {
      // Stories
      const notSupportedEmbed = [new discord.MessageEmbed()
        .setColor('#E1306C')
        .setTitle('Stories not supported at the moment')
        // .setDescription(e)
        .setFooter(`Instagram`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
      ];
      await sentMessage.edit({ embed: notSupportedEmbed[0] });
    }
    else if (link.match(/https:\/\/(www\.)*instagram\.com\/reel\/[\w\d]+\/\d+/)) {
      // Reel
      const notSupportedEmbed = [new discord.MessageEmbed()
        .setColor('#E1306C')
        .setTitle('Reel not supported at the moment')
        // .setDescription(e)
        .setFooter(`Instagram`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
      ];
      await sentMessage.edit({ embed: notSupportedEmbed[0] });
    }
    else if (link.match(/https:\/\/(www\.)*instagram\.com\/tv\/[\w\d]+\/\d+/)) {
      // TV
      const notSupportedEmbed = [new discord.MessageEmbed()
        .setColor('#E1306C')
        .setTitle('TV not supported at the moment')
        // .setDescription(e)
        .setFooter(`Instagram`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
      ];
      await sentMessage.edit({ embed: notSupportedEmbed[0] });
    }
    else {
      // Profile
      const PROFILE_DIV = 'vtbgv ';
      const PROFILE_PICTURE = '_6q-tv';
      const DESCRIPTION_DIV = '-vDIg';
      const USERNAME_CLASS = '_7UhW9';

      logger.debug('Creating page');
      const page = await browser.newPage();
      logger.debug(`Navigating to profile ${link}`);
      await page.goto(link);
      await page.waitForTimeout(CONFIG.instagram.navigationTimeout);

      if (await isPrivate(page)) {
        logger.debug('User is private. Closing page.');
        await page.close();
        const errorEmbed = [new discord.MessageEmbed()
          .setColor('#E1306C')
          .setTitle('Profile is private')
          .setFooter(`Instagram`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
        ];

        await sentMessage.edit({ embed: errorEmbed[0] });
        return;
      }
      
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

      // await editMessage(webhook, sentMessage, embeds);
      // await webhook.delete();

      await sentMessage.edit({ embed: embeds[0] });
    }
  }
  catch (e) {
    const errorEmbed = [new discord.MessageEmbed()
      .setColor('#E1306C')
      .setTitle('ERROR')
      .setDescription(e)
      .setFooter(`Instagram`, 'https://instagram-brand.com/wp-content/uploads/2016/11/Instagram_AppIcon_Aug2017.png?w=300')
    ];
    // await editMessage(webhook, sentMessage, errorEmbed);
    // await webhook.delete();

    await sentMessage.edit({ embed: errorEmbed[0] });
    logger.error(e);
  }
};

module.exports = {
  run
}
