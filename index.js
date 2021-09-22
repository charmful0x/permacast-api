const Arweave = require("arweave")
const express = require("express");
const RSS = require("rss");
const { STAKING_CONTRACT } = require("./contracts.js");
const homepageHtml = require("./src/homepage.js");
const { SmartWeaveNodeFactory, LoggerFactory } = require("redstone-smartweave");

const arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
      timeout: 20000,
      logging: false,
    });

const smartweave = SmartWeaveNodeFactory.memCached(arweave);
LoggerFactory.INST.logLevel("fatal");

const app = express();
const port = process.env.PORT || 3000



async function findPodcast({contractId, podcastId}) {

      const contract = smartweave.contract(contractId);
      const contractState = await contract.readState();
      const wantedPodcast = (contractState.state.podcasts).find(podcast => podcast.pid === podcastId)
      
      return generateRss(wantedPodcast)
}


function blockheightToDate(bh) {
      const EPOCH = 1528451997
      const date = EPOCH + (bh / 720 * 24 * 3600) // To fix - (Mon, 19 Jan 1970 17:48:44 GMT seems wrong)

      return date
}

function generateRss(podcast) {

      const IMG = `https://arweave.net/${podcast.cover}`;


      const feed = new RSS({
            custom_namespaces: { 'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd' },
            title: podcast.podcastName,
            description: podcast.description,
            managingEditor: `${podcast.owner}@weve.email`,
            image_url: IMG,
            site_url: `https://permacast-v1.surge.sh/#/podcasts/${podcast.pid}`,
            language: podcast.language,
            custom_elements: [
                  {'itunes:image': { _attr: { href: IMG } } },
                  {'itunes:email' :podcast.email},
                  {'itunes:explicit': podcast.explicit}, 
                  {'itunes:author': podcast.author},
                  {'itunes:category': podcast.categories}
            ]
      });

      for (let episode of podcast.episodes) {

            feed.item({
                  title: episode.episodeName,
                  description: episode.description,
                  enclosure: { url:`https://arweave.net/${episode.audioTx}`, length: episode.audioTxByteSize, type: episode.type },
                  guid: episode.eid,
                  date: episode.uploadedAt, //block's timestamp
            })
      }

      return feed.xml({indent: true}) 
}

async function getPromotedPodcasts({limit}) {
      limit = Number(limit)

      if ( (!Number.isInteger(limit)) || (limit <= 0) ) {
            throw new Error("invalid limit pased")
      }

      const contract = smartweave.contract(STAKING_CONTRACT);
      const contractState = await contract.readState();
      const electedPodcasts = (contractState.state.proposals).filter( (p, index) => index < limit)
      
      return electedPodcasts.map(podcast => podcast.pid)
};


/* EXPRESS API REQS */

// e.g. /rss/iEHZpnWKH4cNfen4rZEBYkgct2Cw4GEbPhbw1g2MS8I/HlRAyBBCaYeWAU8G1dPEY6eOsGVvrlrJVaFAHTr9h0M
app.get("/rss/:contractId/:podcastId", async(req, res) => {
      res.setHeader('Content-Type', 'application/xml');
      const xml = await findPodcast(req.params)
      res.send(xml)
});

// e.g. /staking/1
app.get("/staking/:limit", async(req, res) => {
      res.send( await getPromotedPodcasts(req.params) )
})

app.get("/", (req, res) => {
  res.send(homepageHtml.html);
});

app.listen(port, () => {
      console.log(`listening at http://localhost:${port}`)
});
