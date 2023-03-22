const { REST } = require('discord.js')

const express = require('express'),
    app = express(),
    fs = require('fs'),
    path = require('path'),
    request = require('node-fetch'),
    cheerio = require("cheerio"),
    { QuickDB } = require("quick.db"),
    db = new QuickDB(),
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    },
    KEYS = {
        HOST: "https://www.imdb.com/",
        HREF: "#main > div > div.lister.list.detail.sub-list > div > div:nth-child(1) > div.lister-item-content > h3 > a",
        HREF_2: "#__next > main > div > section.ipc-page-background.ipc-page-background--base.sc-f9e7f53-0.ifXVtO > section > div:nth-child(4) > section > section > div.sc-663f405c-2.lhDUmU > div.sc-663f405c-3.bSUTIm > div > div.sc-27217dda-1.SFQkO > div > a",
        NAME: "#__next > main > div > section.ipc-page-background.ipc-page-background--base.sc-f9e7f53-0.ifXVtO > section > div:nth-child(4) > section > section > div.sc-b5e8e7ce-0.dZsEkQ > div.sc-b5e8e7ce-1.kNhUtn > h1",
        IMAGE: "#__next > main > div.ipc-page-content-container.ipc-page-content-container--full.sc-4f91839f-0.hmcKDt > div.sc-92eff7c6-1.cXWtZP.media-viewer > div:nth-child(4) > img",
        SEARCH: function(data){
            return `search/title/?title=${data}&title_type=feature,tv_movie,tv_series`
        },
        SEARCH_1: function(data){
            return `title/${data}/?ref_=tt_mv_close`
        }
    }

app.get('/', async (req, res) => {
    const directories = source =>
        fs.readdirSync(path.join(__dirname) + '/public/shows/', { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
    const shows = directories();
    for (const show of shows){
        const data = await getData(show)
        if (data) res.write('<a href=\"' + show + '\">' + `<div style="text-align:center"><img style="border-radius: 50%;"src=${data.img} width="150" height="150" alt=${data.name}/><figcaption>${data.name}</figcaption></div>`)
    }
    return res.send();
})
app.set('view engine', 'ejs');
app.use(express.json());
app.engine('ejs', require('ejs').__express);

app.post('/progress', (req,res)=>{
    console.log(req.body);
    if (!req.body || !req.body.current_duration || !req.body.now_playing) return undefined;
    db.set('progress', req.body)
    res.send('OK')
})

app.get('/progress', async (req,res)=>{
     res.send(await db.get('progress'));
})

app.get('/:show', (req, res) => {
    const show = path.join(__dirname + '/public/shows/' + req.params.show);
    if (!fs.existsSync(show)) return undefined;
    fs.readdir(show, function(err, files) {
        var video = [];
        files.forEach(function(file) { video.push({ name: file, src: '/static/shows/' + req.params.show + '/' + file })});
        res.render('video.ejs', { video: JSON.stringify(video), show: req.params.show })
    })
})

app.use('/static', express.static(path.join(__dirname, 'public')))

app.listen(3000, () => {
    console.log(`Server listening on port 3000`)
})

async function getBody(url){
    let response = await request(url,{ HEADERS })
    let body = await response.text();
    let $ = cheerio.load(body);
    return $;
}

async function getData(show){
    let data = await db.get(show);
    if (!data) data = {}
    if (data.ignore) return undefined;
    if (data.path && fs.existsSync(data.path)) return data
    else data = {}
    let $ = await getBody(KEYS.HOST + KEYS.SEARCH(show))
    let href = $(KEYS.HREF).attr('href')
    if (!href) {
        data.ignore = true;
        data.name = show;
        return db.set(show,data);
    }
    const title_id = href.split('/')[2]
    data.title_id = title_id
    $ = await getBody(KEYS.HOST + KEYS.SEARCH_1(title_id))
    href = $(KEYS.HREF_2).attr('href');
    data.name = $(KEYS.NAME).text();
    while(!href){
        $ = await getBody(KEYS.HOST + KEYS.SEARCH_1(title_id))
        href = $(KEYS.HREF_2).attr('href');
        data.name = $(KEYS.NAME).text();
    }
    while (!data.name || !data.name.length){
        $ = await getBody(KEYS.HOST + KEYS.SEARCH_1(title_id))
        data.name = $(KEYS.NAME).text();
    }
    $ = await getBody(KEYS.HOST + href);
    data.img = $(KEYS.IMAGE).attr('src');
    let ext = /(?:\.([^.]+))?$/.exec(data.img)
    data.ext = ext[0]
    request(data.img).then(res => res.body.pipe(fs.createWriteStream('./public/thumbnails/' + data.title_id + ext[0])))
    data.path = './public/thumbnails/' + data.title_id + ext[0]
    db.set(show,data);
    return data
}