var Promise  = require('bluebird'),
  azure    = require("azure-storage"),
  sanitize = require("sanitize-filename"),
  uuid     = require("node-uuid");


console.log(uuid);



console.log(uuid.v1().split("").reverse().join(""));
