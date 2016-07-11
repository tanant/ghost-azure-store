var Promise  = require('bluebird'),
    azure    = require("azure-storage"),
    sanitize = require("sanitize-filename"),
    uuid     = require("node-uuid");

var pkg_info = require("./package.json");
const util = require('util');

function log(){
  // just extending the logger function out as an exercise
  var d = new Date();
  console.log("%s:[%s]:%s", d.toISOString(),
                            pkg_info.name,
                            util.format.apply(this, Array.from(arguments)));
}

function error() {
  // just extending the logger function out as an exercise
  var d = new Date();
  console.error("%s:[%s]:%s", d.toISOString(),
                              package.name,
                              util.format.apply(this, Array.from(arguments)));
}

function AzureStore(config) {
  options = config || {};

  log("Beginning init of AzureStore services");
  var blobSvc;

  if (options.useDevelopmentStore){
    log("Using development storage instance");
    var devStoreCreds = azure.generateDevelopmentStorageCredendentials();
    blobSvc = azure.createBlobService(devStoreCreds);
    // TODO: put in an option to redirect the dev store to another place/port etc
    //       currently assumes you're doing the defaults. If you're mad enough to be tweaking the defaults?
    //       then odds on you're savvy enough to be opening up the .config in the
    //       %PROGRAMFILES(X86)%\Microsoft SDKs\Azure\Storage Emulator folder (or wherever you installed the emulator)
    //       and patching that. If you do go down that route, I'd suggest just using the connection string uberapproach
    //       as per below (which, okay, I haven't yet implemented cleanly..)
    //        DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;
    //        AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;
    //        BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;
    //        TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;
    //        QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;
    options.storage_URI = blobSvc.host.primaryHost;
  }
  else{
    if (options.SAS_token === undefined){
      log("using auth key for access");
      // TODO: this is the more primitive version, should be able to spec other
      //       params here. no support for overriding the storage_URI if you're not in SAS mode
      blobSvc = azure.createBlobService(options.storage_account, options.access_key);
      options.storage_URI = "http://" + options.storage_account + ".blob.core.windows.net";
    }
    else{
      log("using SAS credentials for access");
      if (!options.storage_URI){
        options.storage_URI = "http://" + options.storage_account + ".blob.core.windows.net";
      }
      blobSvc = azure.createBlobServiceWithSas(options.storage_URI, options.SAS_token);
    }
  }

  if (!options.alias_URI) {
    log("Setting public access URI to defaults")
    options.alias_URI = options.storage_URI;
  }
  
  // now we have created the connection string, let's take a punt that it's rather long-lived, and let's
  // just cache this so we can centralise the logic.
  options._blobSvc = blobSvc;


  blobSvc.createContainerIfNotExists(
    options.container,
    { publicAccessLevel : 'blob' },
    function(error, result, response) {
      if (!error) {
        log("Container '%s' exists, and is set to public", options.container);
      } else {
        error("Couldn't create container '%s' container! Please check your Azure storage settings", options.container, error);
      }
    }
  );

  if (options.target_dir_style === undefined) {
    options.target_dir_style = 'date';
  }
  if (options.date_separator === undefined){
    options.date_separator = '-';
  }
  if (options.uuid_separator === undefined){
    options.uuid_separator = '-';
  }
  var dirfn;
  switch(options.target_dir_style){
    case 'uuid':
      log('using UUID style');
      dirfn = function() {
        return uuid.v1().replace(/-/g ,options.uuid_separator);
      };
      break;

    default:
      log("default fallen through to, using 'date'");
       dirfn = function() {
        var date = new Date().toISOString();
        date = date.split("T")[0];
        return date.replace(/-/g, options.date_separator);
      };
  }

  AzureStore.prototype.getTargetDir=dirfn;

}

AzureStore.prototype.save = function(image) {

  // TODO: would be really nice for this to be able to calc the MD5 hash, and see if we're doing duplicate uploads
  //       i have a bad feeling this would require indexing everything in a table store mind you because
  //       that's effectively, an index.

    console.log(this.getTargetDir());
  var targetDir = this.getTargetDir() + "/";
  var targetFilename = targetDir + this.getTargetFilename(image.name);


  blobSvc = options._blobSvc;

  return new Promise(function (resolve, reject) {
    log("Trying to commit image from temp:" , image.path);
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
        var fullURL = options.alias_URI + "/" + options.container + "/" + targetFilename;
        if (!error) {
          log("Image successfully uploaded to", fullURL);
          resolve(fullURL);
        } else {
          error("Couldn't upload image to ", fullURL, "!\n", image, error);
          reject(error);
        }
      }
    );
  });
};



AzureStore.prototype.getTargetFilename = function(filename) {
  return sanitize(filename.replace(/\s/g, "-"));
}

AzureStore.prototype.serve = function() {
  // From the Ghost wiki...
  // "If your module's .save() method returns absolute URLs,
  // .serve() can be a no-op passthrough middleware function"

  // TODO: this is probably the more natural place to pop in the alias_URI sub
  return function (req, res, next) {
    next();
  };
};

module.exports = AzureStore;
