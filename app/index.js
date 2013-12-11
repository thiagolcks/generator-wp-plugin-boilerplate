'use strict';
var util     = require('util');
var path     = require('path');
var yeoman   = require('yeoman-generator');
var http     = require('http');
var fs       = require('fs');
var request  = require('request');
var admzip   = require('adm-zip');
var rmdir    = require('rimraf');
var _s       = require('underscore.string');
var ncp      = require('ncp');
var Replacer = require('./replacer');

var WppluginGenerator = module.exports = function WppluginGenerator(args, options, config) {
  var self = this;

  yeoman.generators.Base.apply(this, arguments);

  this.on('end', function () {
    var key = null;
    for (key in self.files) {
      if (self.files.hasOwnProperty(key)) {
        self.files[key].replace();
      }
    }

    console.log("All done!");
  });

  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};

util.inherits(WppluginGenerator, yeoman.generators.Base);

WppluginGenerator.prototype.askFor = function askFor() {
  var cb = this.async(),
    prompts = [];

  // have Yeoman greet the user.
  console.log(this.yeoman);

  prompts = [{
    name: 'name',
    message: 'What do you want to call your plugin?',
    default: 'My New Plugin'
  }, {
    name: 'pluginVersion',
    message: 'What is the version of your new plugin?',
    default: '1.0.0'
  }, {
    name: 'author',
    message: 'What is your name?',
    default: this.pkg.options.author.name
  }, {
    name: 'authorEmail',
    message: 'What is your e-mail?',
    default: this.pkg.options.author.email
  }, {
    name: 'authorURI',
    message: 'What is your URL?',
    default: this.pkg.options.author.url
  }, {
    name: 'copyright',
    message: 'What goes in copyright tags?',
    default: this.pkg.options.author.copyright
  }, {
    type: 'checkbox',
    name: 'publicResources',
    message: 'Which resources your plublic site needs?',
    choices: [{name: "JS", checked: true}, {name: "CSS", checked: true}]
  }, {
    type: 'checkbox',
    name: 'activateDeactivate',
    message: 'Which resources your plugin needs?',
    choices: [{name: "Activate Method", checked: true}, {name: "Deactivate Method", checked: true}, {name: "Uninstall File", checked: true}]
  }, {
    type: 'confirm',
    name: 'adminPage',
    message: 'Does your plugin need a admin page?'
  }];

  this.prompt(prompts, function (props) {
    this.pluginName         = props.name;
    this.pluginSlug         = _s.slugify(props.name);
    this.pluginClassName    = _s.classify(this.pluginSlug);
    this.author             = props.author;
    this.authorEmail        = props.authorEmail;
    this.authorURI          = props.authorURI;
    this.pluginVersion      = props.pluginVersion;
    this.pluginCopyright    = props.copyright;
    this.publicResources    = props.publicResources;
    this.activateDeactivate = props.activateDeactivate;
    this.adminPage          = props.adminPage;

    // Set the path of the files
    this.files = {
      primary: new Replacer(this.pluginSlug + '/' + this.pluginSlug + '.php', this),
      public_class: new Replacer(this.pluginSlug + '/public/class-' + this.pluginSlug + '.php', this),
      admin_class: new Replacer(this.pluginSlug + '/admin/class-' + this.pluginSlug + '-admin.php', this),
      public_view: new Replacer(this.pluginSlug + '/public/views/public.php', this),
      admin_view: new Replacer(this.pluginSlug + '/admin/views/admin.php', this),
      uninstall: new Replacer(this.pluginSlug + '/uninstall.php', this),
      readme: new Replacer(this.pluginSlug + '/README.txt', this)
    };

    cb();
  }.bind(this));
};

WppluginGenerator.prototype.download = function download() {
  var cb = this.async(),
    self = this;

  console.log("Downloading the WP Plugin Boilerplate...");

  request('http://github.com/tommcfarlin/WordPress-Plugin-Boilerplate/archive/master.zip')
  .pipe(fs.createWriteStream('plugin.zip'))
  .on('close', function () {
    var zip = new admzip("./plugin.zip");
    console.log('File downloaded');
    zip.extractAllTo("plugin_temp", true);
    fs.rename('./plugin_temp/WordPress-Plugin-Boilerplate-master/plugin-name/', './' + self.pluginSlug, function () {
      rmdir('plugin_temp', function (error){
        cb();
      });
    });
    fs.unlink('plugin.zip');
  });
};

// WppluginGenerator.prototype.copyPlugin = function copyPlugin() {
//   var cb = this.async();
//   ncp('./base', './' + this.pluginSlug, function () {
//     cb();
//   });
// };

WppluginGenerator.prototype.setFiles = function setName() {
  // Rename files
  fs.rename(this.pluginSlug + '/plugin-name.php', this.files.primary.file);
  fs.rename(this.pluginSlug + '/admin/class-plugin-name-admin.php', this.files.admin_class.file);
  fs.rename(this.pluginSlug + '/public/class-plugin-name.php', this.files.public_class.file);
};

WppluginGenerator.prototype.setPrimary = function setName() {
  this.files.primary.add(/Plugin Name:( {7})@TODO/g, 'Plugin Name:       ' + this.pluginName);
  this.files.primary.add(/Version:( {11})1\.0\.0/g, 'Version:           ' + this.pluginVersion);
  this.files.primary.add(/Author:( {12})@TODO/g, 'Author:            ' + this.author);
  this.files.primary.add(/Author URI:( {8})@TODO/g, 'Author URI:        ' + this.authorURI);
  this.files.primary.rm("/*\n * @TODO:\n *\n * - replace `class-" + this.pluginSlug + ".php` with the name of the plugin's class file\n *\n */\n");
  this.files.primary.rm(" *\n * @TODO:\n *\n * - replace " + this.pluginClassName + " with the name of the class defined in\n *   `class-" + this.pluginSlug + ".php`\n");
  this.files.primary.rm("/*\n * @TODO:\n *\n * - replace " + this.pluginClassName + " with the name of the class defined in\n *   `class-" + this.pluginSlug + ".php`\n */");
  this.files.primary.rm(" * @TODO:\n *\n * - replace `class-plugin-admin.php` with the name of the plugin's admin file\n * - replace " + this.pluginClassName + "Admin with the name of the class defined in\n *   `class-" + this.pluginSlug + "-admin.php`\n *\n");

  // Activate/desactivate
  if (this.activateDeactivate.indexOf('Activate Method') === -1 && this.activateDeactivate.indexOf('Deactivate Method') === -1) {
    this.files.primary.rm("\n/*\n * Register hooks that are fired when the plugin is activated or deactivated.\n * When the plugin is deleted, the uninstall.php file is loaded.\n */\nregister_activation_hook( __FILE__, array( '" + this.pluginClassName + "', 'activate' ) );\nregister_deactivation_hook( __FILE__, array( '" + this.pluginClassName + "', 'deactivate' ) );\n");
  }
  if (this.activateDeactivate.indexOf('Activate Method') === -1) {
    this.files.primary.rm("\nregister_activation_hook( __FILE__, array( '" + this.pluginClassName + "', 'activate' ) );");
  }
  if (this.activateDeactivate.indexOf('Deactivate Method') === -1) {
    this.files.primary.rm("\nregister_deactivation_hook( __FILE__, array( '" + this.pluginClassName + "', 'deactivate' ) );");
  }
};

WppluginGenerator.prototype.setAdminClass = function setAdminClass() {
  var regexp;
  this.files.admin_class.rm(" * @TODO: Rename this class to a proper name for your plugin.\n *\n");
  this.files.admin_class.rm("\t\t/*\n\t\t * Call $plugin_slug from public plugin class.\n\t\t *\n\t\t * @TODO:\n\t\t *\n\t\t * - Rename \"" + this.pluginClassName + "\" to the name of your initial plugin class\n\t\t *\n\t\t */\n");
  regexp = new RegExp("\\* \\@TODO:\\n\\t \\*\\n\\t \\* - Rename \"" + this.pluginClassName + "\" to the name your plugin\\n\\t \\*\\n\\t ", "g");
  this.files.admin_class.rm(regexp);

  // this.adminPage
  if (this.adminPage === false) {
    this.files.admin_class.rm("\n\t\t// Add an action link pointing to the options page.\n\t\t$plugin_basename = plugin_basename( plugin_dir_path( __DIR__ ) . $this->plugin_slug . '.php' );\n\t\tadd_filter( 'plugin_action_links_' . $plugin_basename, array( $this, 'add_action_links' ) );");
    this.files.admin_class.rm("\n\n\t\t// Load admin style sheet and JavaScript.\n\t\tadd_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_styles' ) );\n\t\tadd_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );\n\n\t\t// Add the options page and menu item.\n\t\tadd_action( 'admin_menu', array( $this, 'add_plugin_admin_menu' ) );");
    this.files.admin_class.rm("\n\t/**\n\t * Register and enqueue admin-specific style sheet.\n\t *\n\t * @since     1.0.0\n\t *\n\t * @return    null    Return early if no settings page is registered.\n\t */\n\tpublic function enqueue_admin_styles() {\n\n\t\tif ( ! isset( $this->plugin_screen_hook_suffix ) ) {\n\t\t\treturn;\n\t\t}\n\n\t\t$screen = get_current_screen();\n\t\tif ( $this->plugin_screen_hook_suffix == $screen->id ) {\n\t\t\twp_enqueue_style( $this->plugin_slug .'-admin-styles', plugins_url( 'assets/css/admin.css', __FILE__ ), array(), MyNewPlugin::VERSION );\n\t\t}\n\n\t}\n\n\t/**\n\t * Register and enqueue admin-specific JavaScript.\n\t *\n\t * @since     1.0.0\n\t *\n\t * @return    null    Return early if no settings page is registered.\n\t */\n\tpublic function enqueue_admin_scripts() {\n\n\t\tif ( ! isset( $this->plugin_screen_hook_suffix ) ) {\n\t\t\treturn;\n\t\t}\n\n\t\t$screen = get_current_screen();\n\t\tif ( $this->plugin_screen_hook_suffix == $screen->id ) {\n\t\t\twp_enqueue_script( $this->plugin_slug . '-admin-script', plugins_url( 'assets/js/admin.js', __FILE__ ), array( 'jquery' ), MyNewPlugin::VERSION );\n\t\t}\n\n\t}\n\n\t/**\n\t * Register the administration menu for this plugin into the WordPress Dashboard menu.\n\t *\n\t * @since    1.0.0\n\t */\n\tpublic function add_plugin_admin_menu() {\n\n\t\t/*\n\t\t * Add a settings page for this plugin to the Settings menu.\n\t\t *\n\t\t * NOTE:  Alternative menu locations are available via WordPress administration menu functions.\n\t\t *\n\t\t *        Administration Menus: http://codex.wordpress.org/Administration_Menus\n\t\t *\n\t\t * @TODO:\n\t\t *\n\t\t * - Change 'Page Title' to the title of your plugin admin page\n\t\t * - Change 'Menu Text' to the text for menu item for the plugin settings page\n\t\t * - Change 'manage_options' to the capability you see fit\n\t\t *   For reference: http://codex.wordpress.org/Roles_and_Capabilities\n\t\t */\n\t\t$this->plugin_screen_hook_suffix = add_options_page(\n\t\t\t__( 'Page Title', $this->plugin_slug ),\n\t\t\t__( 'Menu Text', $this->plugin_slug ),\n\t\t\t'manage_options',\n\t\t\t$this->plugin_slug,\n\t\t\tarray( $this, 'display_plugin_admin_page' )\n\t\t);\n\n\t}\n\n\t/**\n\t * Render the settings page for this plugin.\n\t *\n\t * @since    1.0.0\n\t */\n\tpublic function display_plugin_admin_page() {\n\t\tinclude_once( 'views/admin.php' );\n\t}\n\n\t/**\n\t * Add settings action link to the plugins page.\n\t *\n\t * @since    1.0.0\n\t */\n\tpublic function add_action_links( $links ) {\n\n\t\treturn array_merge(\n\t\t\tarray(\n\t\t\t\t'settings' => '<a href=\"' . admin_url( 'options-general.php?page=' . $this->plugin_slug ) . '\">' . __( 'Settings', $this->plugin_slug ) . '</a>'\n\t\t\t),\n\t\t\t$links\n\t\t);\n\n\t}");
  }
};

WppluginGenerator.prototype.setPublicClass = function setPublicClass() {
  var regexp;
  this.files.public_class.rm("* @TODO: Rename this class to a proper name for your plugin.\n *\n ");
  regexp = new RegExp("\\* \\@TODO - Rename \"" + this.pluginSlug + "\" to the name your your plugin\\n\\t \\*\\n\\t ", "g");
  this.files.public_class.rm(regexp);

  // Assets - JS/CSS
  if (this.publicResources.length === 0) {
    this.files.public_class.rm("\n\n\t\t// Load public-facing style sheet and JavaScript.");
  }
  if (this.publicResources.indexOf('JS') === -1) {
    this.files.public_class.rm("\n\t\tadd_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );");
    this.files.public_class.rm("\n\n\t/**\n\t * Register and enqueues public-facing JavaScript files.\n\t *\n\t * @since    " + this.pluginVersion + "\n\t */\n\tpublic function enqueue_scripts() {\n\t\twp_enqueue_script( $this->plugin_slug . '-plugin-script', plugins_url( 'assets/js/public.js', __FILE__ ), array( 'jquery' ), self::VERSION );\n\t}");
  }
  if (this.publicResources.indexOf('CSS') === -1) {
    this.files.public_class.rm("\n\t\tadd_action( 'wp_enqueue_scripts', array( $this, 'enqueue_styles' ) );");
    this.files.public_class.rm("\n\n\t/**\n\t * Register and enqueue public-facing style sheet.\n\t *\n\t * @since    " + this.pluginVersion + "\n\t */\n\tpublic function enqueue_styles() {\n\t\twp_enqueue_style( $this->plugin_slug . '-plugin-styles', plugins_url( 'assets/css/public.css', __FILE__ ), array(), self::VERSION );\n\t}");
  }

  // Activate/desactivate
  if (this.activateDeactivate.indexOf('Activate Method') === -1) {
    this.files.public_class.rm("\n\t\t// Activate plugin when new blog is added\n\t\tadd_action( 'wpmu_new_blog', array( $this, 'activate_new_site' ) );\n");
    this.files.public_class.rm("\n\t/**\n\t * Fired when the plugin is activated.\n\t *\n\t * @since    1.0.0\n\t *\n\t * @param    boolean    $network_wide    True if WPMU superadmin uses\n\t *                                       \"Network Activate\" action, false if\n\t *                                       WPMU is disabled or plugin is\n\t *                                       activated on an individual blog.\n\t */\n\tpublic static function activate( $network_wide ) {\n\n\t\tif ( function_exists( 'is_multisite' ) && is_multisite() ) {\n\n\t\t\tif ( $network_wide  ) {\n\n\t\t\t\t// Get all blog ids\n\t\t\t\t$blog_ids = self::get_blog_ids();\n\n\t\t\t\tforeach ( $blog_ids as $blog_id ) {\n\n\t\t\t\t\tswitch_to_blog( $blog_id );\n\t\t\t\t\tself::single_activate();\n\t\t\t\t}\n\n\t\t\t\trestore_current_blog();\n\n\t\t\t} else {\n\t\t\t\tself::single_activate();\n\t\t\t}\n\n\t\t} else {\n\t\t\tself::single_activate();\n\t\t}\n\n\t}\n");
    this.files.public_class.rm("\n\t/**\n\t * Fired when a new site is activated with a WPMU environment.\n\t *\n\t * @since    1.0.0\n\t *\n\t * @param    int    $blog_id    ID of the new blog.\n\t */\n\tpublic function activate_new_site( $blog_id ) {\n\n\t\tif ( 1 !== did_action( 'wpmu_new_blog' ) ) {\n\t\t\treturn;\n\t\t}\n\n\t\tswitch_to_blog( $blog_id );\n\t\tself::single_activate();\n\t\trestore_current_blog();\n\n\t}\n");
    this.files.public_class.rm("\n\t/**\n\t * Get all blog ids of blogs in the current network that are:\n\t * - not archived\n\t * - not spam\n\t * - not deleted\n\t *\n\t * @since    1.0.0\n\t *\n\t * @return   array|false    The blog ids, false if no matches.\n\t */\n\tprivate static function get_blog_ids() {\n\n\t\tglobal $wpdb;\n\n\t\t// get an array of blog ids\n\t\t$sql = \"SELECT blog_id FROM $wpdb->blogs\n\t\t\tWHERE archived = '0' AND spam = '0'\n\t\t\tAND deleted = '0'\";\n\n\t\treturn $wpdb->get_col( $sql );\n\n\t}\n");
    this.files.public_class.rm("\n\t/**\n\t * Fired for each blog when the plugin is activated.\n\t *\n\t * @since    1.0.0\n\t */\n\tprivate static function single_activate() {\n\t\t// @TODO: Define activation functionality here\n\t}\n");
  }
  if (this.activateDeactivate.indexOf('Deactivate Method') === -1) {
    this.files.public_class.rm("\n\t/**\n\t * Fired when the plugin is deactivated.\n\t *\n\t * @since    1.0.0\n\t *\n\t * @param    boolean    $network_wide    True if WPMU superadmin uses\n\t *                                       \"Network Deactivate\" action, false if\n\t *                                       WPMU is disabled or plugin is\n\t *                                       deactivated on an individual blog.\n\t */\n\tpublic static function deactivate( $network_wide ) {\n\n\t\tif ( function_exists( 'is_multisite' ) && is_multisite() ) {\n\n\t\t\tif ( $network_wide ) {\n\n\t\t\t\t// Get all blog ids\n\t\t\t\t$blog_ids = self::get_blog_ids();\n\n\t\t\t\tforeach ( $blog_ids as $blog_id ) {\n\n\t\t\t\t\tswitch_to_blog( $blog_id );\n\t\t\t\t\tself::single_deactivate();\n\n\t\t\t\t}\n\n\t\t\t\trestore_current_blog();\n\n\t\t\t} else {\n\t\t\t\tself::single_deactivate();\n\t\t\t}\n\n\t\t} else {\n\t\t\tself::single_deactivate();\n\t\t}\n\n\t}\n\n\t/**\n\t * Fired for each blog when the plugin is deactivated.\n\t *\n\t * @since    1.0.0\n\t */\n\tprivate static function single_deactivate() {\n\t\t// @TODO: Define deactivation functionality here\n\t}\n");
  }

};

WppluginGenerator.prototype.setReadme = function setReadme() {
  this.files.readme.add("@TODO: Plugin Name", this.pluginName);
};

WppluginGenerator.prototype.setUninstall = function setUninstall() {
  if (this.activateDeactivate.indexOf('Uninstall File') === -1) {
    fs.unlink(this.files.uninstall.file);
    delete this.files.uninstall;
  }
};