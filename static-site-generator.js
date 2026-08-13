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
if (fs.existsSync("./camp")) {
  makeDirIfNotExist(path.join(dest, "camp"));
  copydir.sync("./camp", path.join(dest, "camp"));
}


let data = {};
data.site = site;
addPageData(data);

function addPageData(data) {
  var newData = data;


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
    var templatePath = path.join(src, config.templatesDirectory, pageName + ".hbs");
    
    if (fs.existsSync(templatePath)) {
      createPage(pageName, data, path.join(dest, fileName));
    }
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


function createPage(templateName, data, outputFileName) {
  var html = renderFromExternalTemplate(insertPartials(templateName), data);
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
