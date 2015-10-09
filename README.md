# ghost-azure-store
Allows you to store uploaded images in Azure blob storage instead of on the local file store.
Requires Ghost `0.6.0` or higher!

with :purple_heart:,<br />
—@helloitsdan

# How to Use
## Getting the module
1. Create a `storage` folder in your Ghost content root, eg. `/var/www/ghost/content/storage`

### Via Git
2. Clone this repo into your `storage` folder
3. The module will be available under whatever folder name you checked out this repo to, which is `ghost-azure-store` by default

### Via npm
2. Run `npm install ghost-azure-storage` from your Ghost root

  *Note that upgrading Ghost will overwrite your local package.json, so `--save`ing the module will get lost down the line*

3. Create a node script in your `storage` folder which exports the `ghost-azure-storage` module, like so:
  ```
  module.exports = require("ghost-azure-store");
  ```
4. The module will be available under whatever filename you used for the above script. eg. `storage/ghost-azure-store.js` will be available as `ghost-azure-store`

## Configuring Ghost

Add a storage block to Ghost's config, as below. Make sure you change `ghost-azure-store` to the name you chose above!

```
storage :{
  active: 'ghost-azure-store',

  'ghost-azure-store': {
    key: "{azure storage key}",
    storage: "myblogstore",
    container: "my-container"
  }
},
```

Using the above options, images would be uploaded to http://myblogstore.blob.core.windows.net/container/. If you want to give your storage [a custom domain name](https://azure.microsoft.com/en-gb/documentation/articles/storage-custom-domain-name/),
you can also set the `baseURL` config parameter to something along the lines of `http://assets.mylovelyblog.com` and the URLs stored in Ghost's database will
use that instead.
