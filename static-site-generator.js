var fs = require("fs");
var path = require("path");

var handlebars = require("handlebars");
var copydir = require("copy-dir");
var config = require("./config.json");
var site = require("./site.json");
var src = "./" + config.src;
var dest = "./" + config.dest;

makeDirIfNotExist(dest);
makeDirIfNotExist(path.join(dest, "css"));
copydir.sync(path.join(src, "css"), path.join(dest, "css"));
makeDirIfNotExist(path.join(dest, "js"));
copydir.sync(path.join(src, "js"), path.join(dest, "js"));
makeDirIfNotExist(path.join(dest, "img"));
copydir.sync(path.join(src, "img"), path.join(dest, "img"));
makeDirIfNotExist(path.join(dest, "icons"));
copydir.sync(path.join(src, "icons"), path.join(dest, "icons"));
makeDirIfNotExist(path.join(dest, "warpzone"));
copydir.sync(path.join(src, "pages/warpzone"), path.join(dest, "warpzone"));
if (fs.existsSync(path.join(src, "pages/musicjam"))) {
  makeDirIfNotExist(path.join(dest, "musicjam"));
  copydir.sync(path.join(src, "pages/musicjam"), path.join(dest, "musicjam"));
}
if (fs.existsSync(path.join(src, "musicjam"))) {
  makeDirIfNotExist(path.join(dest, "musicjam"));
  copydir.sync(path.join(src, "musicjam"), path.join(dest, "musicjam"));
}
if (fs.existsSync("./musicjam")) {
  makeDirIfNotExist(path.join(dest, "musicjam"));
  copydir.sync("./musicjam", path.join(dest, "musicjam"));
}


let data = {};
data.site = site;
addPageData(data);

function addPageData(data) {
  var newData = data;
  var g4gSchedulePath = path.join(src, "pages", "g4g-stream-schedule.json");
  if (fs.existsSync(g4gSchedulePath)) {
    newData.g4gStreamSchedule = require("./" + g4gSchedulePath);
  }

  var giveForGoodCampaign = newData.site && newData.site.campaigns && newData.site.campaigns.giveForGood
    ? newData.site.campaigns.giveForGood
    : null;

  if (giveForGoodCampaign) {
    var galleryDir = path.join(src, "img", "g4g", "images");
    if (fs.existsSync(galleryDir)) {
      giveForGoodCampaign.galleryImages = fs.readdirSync(galleryDir)
        .filter(function(fileName) {
          return /\.(png|jpe?g|webp)$/i.test(fileName);
        })
        .sort(function(a, b) {
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
        })
        .map(function(fileName) {
          return "img/g4g/images/" + fileName;
        });
    } else {
      giveForGoodCampaign.galleryImages = [];
    }
  }


  newData.site.pages.forEach((page) => {
  
      if (page.file){
        var pageName = page.file.replace(".html", "").replace("/", "").toLowerCase();

        
        var jsonPath = path.join(src, "pages", pageName + ".json");
        if (fs.existsSync(jsonPath)){
          newData[pageName] = require("./" + jsonPath);
        }
     } else{
      page.file = page.url;
     }

      if (giveForGoodCampaign && giveForGoodCampaign.enabled && giveForGoodCampaign.donateNavHighlight && page.file === "donate.html") {
      page.class = page.class ? page.class + " nav-link-donate" : "nav-link-donate";
      }

      if (giveForGoodCampaign && giveForGoodCampaign.enabled && page.file === "index.html") {
      page.class = page.class ? page.class + " nav-link-g4g" : "nav-link-g4g";
      }
   

   
  });
  
  newData["games"].sort(function(a, b) {
    return new Date(b.released) - new Date(a.released);
  });
  return newData;
}

data["games"].sort(function(a, b) {
  return new Date(b.released) - new Date(a.released);
});
fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));


data.site.pages.forEach((page) => {
  if (page.file && !page.file.includes('http')) {
    var pageName = page.file.replace(".html", "").toLowerCase();
    var fileName = page.file;
    
    createPage(pageName, data, path.join(dest, fileName), page);
  }
});


function insertPartials(templateName) {
  var completeTemplate = fs.readFileSync(path.join(src, config.templatesDirectory, templateName + ".hbs"), "utf8");
  
  // Read all partial files from the partialsDirectory
  const partialFiles = fs.readdirSync(path.join(src, config.partialsDirectory)).filter(file => file.endsWith(".hbs"));

  // Register each partial automatically
  partialFiles.forEach((partialFile) => {
    try {
      var partialName = partialFile.replace(".hbs", ""); // Remove the .hbs extension to get the partial name
      var partialTemplate = fs.readFileSync(path.join(src, config.partialsDirectory, partialFile), "utf8");
      handlebars.registerPartial(partialName, partialTemplate); // Register the partial
      console.log(`Registered partial: ${partialName}`); // Debugging log
    } catch (error) {
      console.error(`Error loading partial: ${partialFile} - ${error.message}`);
    }
  });

  return completeTemplate;
}


function createPage(templateName, data, outputFileName, pageMeta) {
  var giveForGoodCampaign = data.site && data.site.campaigns && data.site.campaigns.giveForGood
    ? data.site.campaigns.giveForGood
    : null;

  if (
    pageMeta &&
    pageMeta.file === "donate.html" &&
    giveForGoodCampaign &&
    giveForGoodCampaign.enabled &&
    giveForGoodCampaign.redirectDonateToHome
  ) {
    var redirectHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=index.html">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting...</title>
  <script>
    window.location.replace("index.html");
  </script>
</head>
<body>
  <p>Redirecting to <a href="index.html">home</a>...</p>
</body>
</html>`;

    fs.writeFileSync(outputFileName, redirectHtml);
    return;
  }

  var renderData = Object.assign({}, data);
  renderData.currentPage = {
    slug: templateName,
    isHome: templateName === "index",
    file: pageMeta && pageMeta.file ? pageMeta.file : "",
    name: pageMeta && pageMeta.name ? pageMeta.name : ""
  };

  var html = renderFromExternalTemplate(insertPartials(templateName), renderData);
  fs.writeFileSync(outputFileName, html);
}

function renderFromExternalTemplate(template, data){
  var template = handlebars.compile(template);
  return template(data);
}

function truncate(string, length){
  if (string.length > length)
  return string.substring(0, length)+'...';
  else
  return string;
};

function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isDirectory();
  });
}

function makeDirIfNotExist(filePath) {
  if (!fs.existsSync(filePath)){
    fs.mkdirSync(filePath);
  }
}
