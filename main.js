/**
 * Created by Marc Streit on 06.08.2014.
 */
/* global define */

define(['exports', 'd3', '../caleydo_core/main', '../caleydo_core/idtype', 'lineupjsN', '../caleydo_d3/d3util', 'font-awesome', 'css!./style'], function (exports, d3, C, idtypes, LineUpJS, d3utils) {
  "use strict";
  function deriveColumns(columns) {
    return columns.map(function (col) {
      var r = {
        column : col.desc.name
      };
      if (col.desc.color) {
        r.color = col.desc.color;
      }
      var val = col.desc.value;
      switch (val.type) {
      case 'string':
        r.type = 'string';
        break;
      case 'categorical':
        r.type = 'categorical';
        r.categories = col.desc.categories;
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
    var $div = $parent.append('div');

    var that = this;

    var columns = deriveColumns(this.data.cols());


    var listener = function(event, type, act) {
      if (that.lineup && type === 'selected') {
        that.lineup.data.setSelection(act.dim(0).asList());
      }
    };
    this.data.on('select', listener);
    C.onDOMNodeRemoved($div.node(), function () {
      that.data.off('select', listener);
    });

    // bind data to chart
    Promise.all([this.data.objects(), this.data.rowIds()]).then(function (promise) {
      var arr = promise[0];
      var rowIds = promise[1].dim(0).asList();
      var data = arr.map(function (obj, i) {
        return C.mixin({
          _id : rowIds[i]
        }, obj);
      });
      that.provider = LineUpJS.createLocalStorage(data, columns);
      var dump = that.option('dump');
      if (dump) {
        that.provider.restore(dump);
      }
      that.lineup = LineUpJS.create(that.provider, $div, that.option('lineup'));
      that.lineup.on('hoverChanged', function(data_index) {
        var id = null;
        if (data_index < 0) {
          that.data.clear(idtypes.hoverSelectionType);
        } else {
          id = data[data_index]._id;
          that.data.select(idtypes.hoverSelectionType, [id]);
        }
        that.fire(idtypes.hoverSelectionType, id);
      });
      that.lineup.on('multiSelectionChanged', function(data_indices) {
        if (data_indices.length === 0) {
          that.data.clear(idtypes.defaultSelectionType);
        } else {
          that.data.select(idtypes.defaultSelectionType, data_indices.map(function(index) { return data[index]._id; }));
        }
        that.fire(idtypes.defaultSelectionType, data_indices.length === 0 ? null : data[data_indices[0]]._id);
      });
      that.provider.deriveDefault();
      that.lineup.update();
      that.data.selections().then(function(act) {
        if (!act.isNone) {
          listener(null, 'selected', act);
        }
      });
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
    },
    update: function() {
      if (this.lineup) {
        this.lineup.update();
      }
    }
  });

  exports.create = function (data, parent, options) {
    return new exports.LineUp(data, parent, options);
  };
});
