/**
 * Overrides Jade to give it l10n capabilities.
 */

var jade = require('jade'),
    jadeCompiler = jade.Compiler,
    jadeCompile = jade.compile,
    po2json = require('po2json');

/**
* Compiler constructor
*
* @api public
*/

var Compiler = function (node, options) {
  jadeCompiler.call(this, node, options);

  if (options.languageFile)
    this.jsonData = po2json.parseFileSync(options.languageFile);
};

/**
* Inherits from Compiler.
*/

Compiler.prototype.__proto__ = jadeCompiler.prototype;

/**
* Visit `node`.
*
* @param {Node} node
* @api public
*/

Compiler.prototype.visitNode = function (node) {
  if(this.jsonData && node.getAttribute && undefined !== node.getAttribute('l10n')) {
    var elm = node.block.nodes[0];
    var attr = node.getAttribute('l10n');

    // Apply translation
    if (elm) {
      // Get translation by attribute
      if (typeof attr == 'string') {
        attr = attr.replace(/^['"]|['"]$/g, '');

        if (undefined !== this.jsonData[attr] && this.jsonData[attr][1]) {
          elm.val = this.jsonData[attr][1];
        }
      }

      // Get translation by text
      else if (undefined !== this.jsonData[elm.val] && this.jsonData[elm.val][1]) {
        elm.val = this.jsonData[elm.val][1];
      }
    }

    // Remove l10n attribute
    node.removeAttribute('l10n');
  }

  // Call original visitNode
  return jadeCompiler.prototype.visitNode.call(this, node);
};

/**
 * Compile parse tree to JavaScript.
 *
 * @api public
 */

jade.compile = function (str, options) {
  options.compiler = Compiler;

  return jadeCompile.call(this, str, options);
};

module.exports = jade;