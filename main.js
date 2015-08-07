/**
 * Created by Marc Streit on 06.08.2014.
 */
/* global define */

define(['exports', 'd3', '../caleydo_core/main', 'lineupjs', '../caleydo_core/d3util', 'font-awesome', 'css!./style'], function (exports, d3, C, LineUpJS, d3utils) {
  "use strict";
  function deriveColumns(columns) {
    return columns.map(function (col) {
      var r = {
        column : col.desc.name
      };
      var val = col.desc.value;
      switch (val.type) {
      case 'string':
      case 'categorical':
        r.type = 'string';
        break;
      case 'real':
      case 'int':
        r.type = 'number';
        r.domain = val.range;
        break;
      default:
        r.type = 'string';
        break;
      }
      return r;
    });
  }

  exports.LineUp = d3utils.defineVis('LineUp', {}, function (data) {
    var dim = data.dim;
    return [ Math.min(dim[1] * 100, 1000), Math.min(dim[0] * 20, 600)];
  }, function build($parent) {
    var $div = $parent.append('div').classed('lineup', true);

    var that = this;

    var columns = deriveColumns(this.data.cols());
    // bind data to chart
    C.all([this.data.objects(), this.data.rowIds()]).then(function (promise) {
      var arr = promise[0];
      var rowIds = promise[1].dim(0).asList();
      var data = arr.map(function (obj, i) {
        return C.mixin({
          _id : rowIds[i]
        }, obj);
      });
      that.lineup = LineUpJS.create(LineUpJS.createLocalStorage(data, columns, that.option('layout'), '_id'), $div, that.option('lineup'));
      that.lineup.on('hover', function(row) {
        var id = row ? row._id : null;
        if (row) {
          that.data.select('hovered', [id]);
        } else {
          that.data.clear('hovered');
        }
        that.fire('hovered', row ? row._id : null);
      });
      that.lineup.on('selected', function(row) {
        var id = row ? row._id : null;
        if (row) {
          that.data.select('selected', [id]);
        } else {
          that.data.clear('selected');
        }
        that.fire('selected', row ? row._id : null);
      });
      that.lineup.startVis();
      that.markReady();
    });
    return $div;
  }, {
    transform: function (scale, rotate) {
      var bak = {
        scale: this.options.scale || [1, 1],
        rotate: this.options.rotate || 0
      };
      if (arguments.length === 0) {
        return bak;
      }
      this.$node.style('transform', 'rotate(' + rotate + 'deg)scale(' + scale[0] + ',' + scale[1] + ')');
      var new_ = {
        scale: scale,
        rotate: rotate
      };
      this.fire('transform', new_, bak);
      this.options.scale = scale;
      this.options.rotate = rotate;
      return new_;
    }
  });

  exports.create = function (data, parent, options) {
    return new exports.LineUp(data, parent, options);
  };
});
