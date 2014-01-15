/**
 * Overrides Jade to give it l10n capabilities.
 */

var jade = require('jade'),
    jadeCompiler = jade.Compiler,
    jadeCompile = jade.compile,
    jadeNodes = jade.nodes,
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
  var _this = this;

  if(node.getAttribute)
  {
    if (_this.jsonData) {
      // Translatable blocks
      if (undefined !== node.getAttribute('l10n')) {
        var elm = node.block.nodes[0];
        var attr = node.getAttribute('l10n');
        var subNodes = {};

        // Included translatable elements
        var counter = 1;
        node.block.nodes.forEach(function(node){
          if (node.name) {
            subNodes[counter] = node;
            counter++;
          }
        });

        // Apply translation
        if (elm) {
          if (elm.val)
            var val = parseText(node).replace(/&#32;/g,' ').trim();

          // Get translation by attribute
          if (typeof attr == 'string') {
            attr = attr.replace(/^['"]|['"]$/g, '');

            if (undefined !== _this.jsonData[attr] && _this.jsonData[attr][1]) {
              elm.val = _this.jsonData[attr][1];
            }
          }

          // Get translation by text
          else if (undefined !== _this.jsonData[val] && _this.jsonData[val][1]) {
            var blocks = _this.jsonData[val][1].match(/(\{\{[0-9]+\}\})|(\{\{[0-9]+:.+?\}\})|(((?!\{\{[0-9]+).)*)/g);

            node.block.nodes = [];

            for (index = 0; index < blocks.length; ++index) {
              if (blocks[index]) {
                // Identify node blocks
                var simpleSub = /\{\{([0-9]+)\}\}/g.exec(blocks[index]);
                var translatableSub = /\{\{([0-9]+):(.+)\}\}/g.exec(blocks[index]);

                if (simpleSub || translatableSub) {
                  var subNode = subNodes[simpleSub ? simpleSub[1] : translatableSub[1]];

                  if (subNode) {
                    if (translatableSub) {
                      subNode.block.nodes[0].val = translatableSub[2];
                    }

                    node.block.nodes.push(subNode);
                  }
                } else {
                  node.block.nodes.push(new jadeNodes.Text(blocks[index]));
                }
              }
            }
          }
        }

        // Remove l10n attribute
        node.removeAttribute('l10n');
      }
    }

    // Translatable attributes
    node.attrs.forEach(function (attr) {
      var translatableTag = /l10n-([-a-zA-Z0-9]*)/g.exec(attr.name);

      if (translatableTag && translatableTag[1] !== 'inc') {
        if (_this.jsonData) {
          var translation = _this.jsonData[attr.escaped ? JSON.parse(attr.val) : attr.val];

          if (translation) {
            attr.val = '"' + translation[1] + '"';
          }
        }

        attr.name = /l10n-([-a-zA-Z0-9]*)/g.exec(attr.name)[1];
      }
    });
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

function parseText(node)
{
  var textPieces = [], counter = 1;

  node.block.nodes.forEach(function (node) {
    var nodeText = '';
    if (node.name) {
      var alias = String(counter++), content = '';
      node.attrs && node.attrs.forEach(function (attr) {
        if (attr.name === "l10n-inc") {
          content = ":"+parseText(node);
        }
      });

      if (node.block.nodes[0] && node.block.nodes[0].val
          && 0 === node.block.nodes[0].val.indexOf(" ")) {
        nodeText += " ";
      }

      nodeText += "{{";
      nodeText += alias;
      nodeText += content;
      nodeText += "}}";
      textPieces.push(nodeText);
    } else if ("string" === typeof node.val) {
      textPieces.push(node.val);
    }
  });

  return escapeString(textPieces.join(''));
}

function escapeString(str) {
  // http://kevin.vanzonneveld.net
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   improved by: Ates Goral (http://magnetiq.com)
  // +   improved by: marrtins
  // +   improved by: Nate
  // +   improved by: Onno Marsman
  // +   input by: Denny Wardhana
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // +   improved by: Oskar Larsson Högfeldt (http://oskar-lh.name/)
  // *     example 1: addslashes("kevin's birthday");
  // *     returns 1: 'kevin\'s birthday'
  return (str + '').replace(/[\\"]/g, '\\$&').replace(/\u0000/g, '\\0');
}

module.exports = jade;