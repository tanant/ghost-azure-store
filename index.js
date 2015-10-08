var util        = require("util"),
    Promise     = require('bluebird'),
    baseStore   = require('../../core/server/storage/base'),
    azure       = require("azure-storage"),
    sanitize    = require("sanitize-filename");

var options;

function AzureStore(config) {
  options = config || {};

  if (!options.baseURL) {
    options.baseURL = "http://" + options.storage + ".blob.core.windows.net";
  }

  console.log("[Azure] store started at", options.baseURL);

  var blobSvc = azure.createBlobService(options.storage, options.key);

  blobSvc.createContainerIfNotExists(
    options.container,
    { publicAccessLevel : 'blob' },
    function(error, result, response) {
      if (!error) {
        console.log("[Azure]", options.container, "container exists and is set to public");
      } else {
        console.error("[Azure] Couldn't create", options.container, "container! Please check your Azure storage settings", error);
      }
    }
  );
}

util.inherits(AzureStore, baseStore);

AzureStore.prototype.save = function(image) {
  var targetDir = this.getTargetDir() + "/";
  var targetFilename = targetDir + this.getTargetFilename(image.name);

  var blobSvc = azure.createBlobService(options.storage, options.key);

  return new Promise(function (resolve, reject) {
    blobSvc.createBlockBlobFromLocalFile(
      options.container,
      targetFilename,
      image.path,
      {
        contentType: image.type,
        cacheControl: "max-age=" + (30 * 24 * 60 * 60),
        metadata: {
          fileName: image.name
        }
      },
      function(error, result, response) {
        var fullURL = options.baseURL + "/" + options.container + "/" + targetFilename;

        if (!error) {
          console.log("[Azure] Image successfully uploaded to", fullURL);
          resolve(fullURL);
        } else {
          console.error("[Azure] Couldn't upload image to ", fullURL, "!\n", image, error);
          reject(error);
        }
      }
    );
  });
};

AzureStore.prototype.getTargetDir = function() {
  var date = new Date().toISOString();
  date = date.split("T")[0];

  return date.replace(/-/g ,"/");
};

AzureStore.prototype.getTargetFilename = function(filename) {
  return sanitize(filename.replace(/\s/g, "-"));
}

AzureStore.prototype.serve = function() {
  // From the Ghost wiki...
  // "If your module's .save() method returns absolute URLs,
  // .serve() can be a no-op passthrough middleware function"
  return function (req, res, next) {
    next();
  };
};

module.exports = AzureStore;
