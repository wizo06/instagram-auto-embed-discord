const cheerio = require('cheerio')
const { Client, Intents, MessageEmbed } = require('discord.js');
const fetch = require('node-fetch')
const logger = require('@wizo06/logger')

const config = require('@iarna/toml').parse(require('fs').readFileSync('config/config.toml'))

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', () => {
  logger.success(`Logged in as ${client.user.tag}!`)
})

client.on('messageCreate', async msg => {
  const arr = msg.content.split(' ')
  const filtered = arr.filter(ele => ele.match(/^https:\/\/(www\.)?instagram\.com/))
  for (const link of filtered) {
    const urlObj = new URL(link)
    const normalizedLink = `${urlObj.origin}${urlObj.pathname}`
    logger.info(normalizedLink)

    // Post
    if (normalizedLink.match(/^https:\/\/(www\.)?instagram\.com\/p\//i)) {
      const options = {
        headers: {
          'Cookie': config.instagram.cookie
        }
      }
      const res = await fetch(normalizedLink, options)
      const body = await res.text()
      const $ = cheerio.load(body)
  
      const embeds = []

      $('script').each(function (i, elem) {
        if ($(this)['0'].children[0]?.data.startsWith('window.__additionalDataLoaded')) {
          const func = $(this)['0'].children[0]?.data
          const extractedJson = func.replace(/(^window\.__additionalDataLoaded\('(\/|[0-9A-z]|-)+',)|(\);$)/g, '')
          const json = JSON.parse(extractedJson)
          const data = json.graphql.shortcode_media
          const author = `${data.owner.full_name} (${data.owner.username})`
          
          // Multi images in a single post
          if (data.edge_sidecar_to_children) {
            for (const edge of data.edge_sidecar_to_children.edges) {
              const embed = new MessageEmbed()
              .setColor('#E1306C')
              .setFooter('Instagram', 'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico')
              .setImage(edge.node.display_url)
              .setDescription(data.edge_media_to_caption.edges[0] ? data.edge_media_to_caption.edges[0].node.text : '')
              .setAuthor(author, data.owner.profile_pic_url, `https://www.instagram.com/${data.owner.username}`)
              .setURL(`https://www.instagram.com/${data.owner.username}`)
  
              embeds.push(embed)
            }
          }
          // Single image in a single post
          else {
            const embed = new MessageEmbed()
            .setColor('#E1306C')
            .setFooter('Instagram', 'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico')
            .setImage(data.display_url)
            .setDescription(data.edge_media_to_caption.edges[0] ? data.edge_media_to_caption.edges[0].node.text : '')
            .setAuthor(author, data.owner.profile_pic_url, `https://www.instagram.com/${data.owner.username}`)
            .setURL(`https://www.instagram.com/${data.owner.username}`)

            embeds.push(embed)
      }
        }
      })
  
      return await msg.channel.send({ embeds })
    }
  
    // Reel
    if (normalizedLink.match(/^https:\/\/(www\.)?instagram\.com\/reel\//i)) {
      const options = {
        headers: {
          'Cookie': config.instagram.cookie
        }
      }
      const res = await fetch(normalizedLink, options)
      const body = await res.text()
      const $ = cheerio.load(body)

      const embed = new MessageEmbed()
      .setColor('#E1306C')
      .setFooter('Instagram', 'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico')

      $('script').each(function (i, elem) {
        if ($(this)['0'].children[0]?.data.startsWith('window.__additionalDataLoaded')) {
          const func = $(this)['0'].children[0]?.data
          const extractedJson = func.replace(/(^window\.__additionalDataLoaded\('(\/|[0-9A-z]|-)+',)|(\);$)/g, '')
          const json = JSON.parse(extractedJson)
          const data = json.graphql.shortcode_media
          const author = `${data.owner.full_name} (${data.owner.username})`
          
          embed
          .setImage(data.display_url)
          .setDescription(data.edge_media_to_caption.edges[0] ? data.edge_media_to_caption.edges[0].node.text : '')
          .setAuthor(author, data.owner.profile_pic_url, `https://www.instagram.com/${data.owner.username}`)
        }
      })

      return await msg.channel.send({ embeds: [embed] })
    }

    // TV
    if (normalizedLink.match(/^https:\/\/(www\.)?instagram\.com\/tv\//i)) {
      const options = {
        headers: {
          'Cookie': config.instagram.cookie
        }
      }
      const res = await fetch(normalizedLink, options)
      const body = await res.text()
      const $ = cheerio.load(body)

      const embed = new MessageEmbed()
      .setColor('#E1306C')
      .setFooter('Instagram', 'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico')

      $('script').each(function (i, elem) {
        if ($(this)['0'].children[0]?.data.startsWith('window.__additionalDataLoaded')) {
          const func = $(this)['0'].children[0]?.data
          const extractedJson = func.replace(/(^window\.__additionalDataLoaded\('(\/|[0-9A-z]|-)+',)|(\);$)/g, '')
          const json = JSON.parse(extractedJson)
          const data = json.graphql.shortcode_media
          const author = `${data.owner.full_name} (${data.owner.username})`
          
          embed
          .setImage(data.display_url)
          .setDescription(data.edge_media_to_caption.edges[0] ? data.edge_media_to_caption.edges[0].node.text : '')
          .setAuthor(author, data.owner.profile_pic_url, `https://www.instagram.com/${data.owner.username}`)
        }
      })

      return await msg.channel.send({ embeds: [embed] })
    }

    // Profile
    if (normalizedLink.match(/^https:\/\/(www\.)?instagram\.com\/(\w|\.)+\/?$/i)) {      
      const options = {
        headers: {
          'Cookie': config.instagram.cookie
        }
      }
      const res = await fetch(normalizedLink, options)
      const body = await res.text()
      const $ = cheerio.load(body)
      
      const embed = new MessageEmbed()
      .setColor('#E1306C')
      .setFooter('Instagram', 'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico')
      
      $('meta').each(function (i, elem) {
        const property = $(this)['0'].attribs.property
        const val = $(this)['0'].attribs.content
        if (property === 'og:title') embed.setTitle(val)
        if (property === 'og:url') embed.setURL(val)
        if (property === 'og:image') embed.setThumbnail(val)
        if (property === 'og:description') embed.setDescription(val)
      })

      return await msg.channel.send({ embeds: [embed] })
    }
  }
})

client.login(config.discord.token)
