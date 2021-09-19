const Arweave = require("arweave")
const express = require("express");
const RSS = require("rss");
const convertion = require("xml-js");
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
const port = 3000



async function findPodcast({contractId, podcastId}) {

      const contract = smartweave.contract(contractId);
      const contractState = await contract.readState();
      const wantedPodcast = (contractState.state.podcasts).find(podcast => podcast.pid === podcastId)
      
      return generateRss(wantedPodcast)
}


function blockheightToDate(bh) {
      const EPOCH = 1528451997
      const date = EPOCH + (bh / 720 * 24 * 3600)

      return date
}

function generateRss(podcast) {

      const feed = new RSS({
            title: podcast.podcastName,
            description: podcast.description,
            managingEditor: podcast.owner,
            image_url: `https://arweave.net/${podcast.cover}`,
            site_url: "https://permacast-v1.surge.sh"
      });

      for (let episode of podcast.episodes) {
            feed.item({
                  title: episode.name,
                  description: episode.description,
                  url: `https://arweave.net/${episode.audioTx}`,
                  guid: episode.eid,
                  date: blockheightToDate(episode.uploadedAt),
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







app.get("/rss/:contractId/:podcastId", async(req, res) => {
      const xml = await findPodcast(req.params)
      let jsonOutput = convertion.xml2json(xml, {compact: false, spaces: 4});
      res.send(jsonOutput)
});

app.get("/staking/:limit", async(req, res) => {
      res.send( await getPromotedPodcasts(req.params) )
})

app.get("/", (req, res) => {
  res.send(homepageHtml.html);
});

app.listen(port, () => {
      console.log(`listening at http://localhost:${port}`)
});