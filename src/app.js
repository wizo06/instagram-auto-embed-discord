const cheerio = require('cheerio')
const Discord = require('discord.js')
const fetch = require('node-fetch')
const logger = require('@wizo06/logger')

const config = require('@iarna/toml').parse(require('fs').readFileSync('config/config.toml'))

const client = new Discord.Client()

client.on('ready', () => {
  logger.success(`Logged in as ${client.user.tag}!`)
})

client.on('message', async msg => {
  const arr = msg.content.split(' ')
  const filtered = arr.filter(ele => ele.match(/^https:\/\/(www\.)?instagram\.com/))
  for (const link of filtered) {
    logger.info(link)
    const urlObj = new URL(link)
    const normalizedLink = `${urlObj.origin}${urlObj.pathname}`
    if (normalizedLink.match(/^https:\/\/(www\.)?instagram\.com\/p\//)) {
      const options = {
        headers: {
          'Cookie': config.instagram.cookie
        }
      }
      const res = await fetch(normalizedLink, options)
      const body = await res.text()
      const $ = cheerio.load(body)
  
      const embed = new Discord.MessageEmbed()
        .setColor('#E1306C')
        .setFooter('Instagram', 'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico')

      // $('script').each(function (i, elem) {
      //   if ($(this)['0'].children[0]?.data.startsWith('window.__additionalDataLoaded')) {
      //     const func = $(this)['0'].children[0]?.data
      //     const extractedJson = func.replace(/(^window\.__additionalDataLoaded\('(\/|[0-9A-z]|-)+',)|(\);$)/g, '')
      //     const json = JSON.parse(extractedJson)
  
      //     const author = `${json.graphql.shortcode_media.owner.full_name} (${json.graphql.shortcode_media.owner.username})`
          
      //     embed
      //       .setImage(json.graphql.shortcode_media.display_url)
      //       .setDescription(json.graphql.shortcode_media.edge_media_to_caption.edges[0].node.text)
      //       .setAuthor(author, json.graphql.shortcode_media.owner.profile_pic_url, 'https://instagram.com/tsai_919')
      //       .setFooter('Instagram', 'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico')
      //   }
      // })  

      $('meta').each(function (i, elem) {
        const property = $(this)['0'].attribs.property
        const val = $(this)['0'].attribs.content
        if (property === 'og:title') embed.setTitle(val)
        if (property === 'og:url') embed.setURL(val)
        if (property === 'og:image') embed.setImage(val)
        if (property === 'og:description') embed.setDescription(val)
      })
  
      return await msg.channel.send(embed)
    }
  
    if (normalizedLink.match(/^https:\/\/(www\.)?instagram\.com\/[\w]+\/?$/)) {      
      const options = {
        headers: {
          'Cookie': config.instagram.cookie
        }
      }
      const res = await fetch(normalizedLink, options)
      const body = await res.text()
      const $ = cheerio.load(body)
      
      const embed = new Discord.MessageEmbed()
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

      return await msg.channel.send(embed)
    }
    
  }
})

client.login(config.discord.token)
