'use strict';

var fs = require('fs');

var Replacer = module.exports = function Replacer(file, options) {
  var module = {},
    searches = [];

  module.add = function (search, replace) {
    searches.push({search: search, replace: replace});
  };

  module.rm = function (search) {
    searches.push({search: search, replace: ''});
  };

  module.file = file;

  // Base replacements
  module.add(/plugin-name/g, options.pluginSlug);
  module.add(/Plugin_Name_Admin/g, options.pluginClassName + 'Admin');
  module.add(/Plugin_Name/g, options.pluginClassName);
  module.add(/Plugin Name\./g, options.pluginName);
  module.add(/Your Name <email@example\.com>/g, options.author + " <" + options.authorEmail + ">");
  module.add(/1\.0\.0/g, options.pluginVersion);
  module.add(/Your Name or Company Name/g, options.pluginCopyright);

  module.replace = function () {
    fs.readFile(file, 'utf8', function (err, data) {
      var i, total;
      if (err) {
        return console.log(err);
      }

      total = searches.length;
      for (i = 0; i < total; i += 1) {
        data = data.replace(searches[i].search, searches[i].replace);
      }

      fs.writeFile(file, data, 'utf8', function (err) {
        if (err) {
          return console.log(err);
        }
      });
    });
  };

  return module;
};