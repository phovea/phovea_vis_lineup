/* *****************************************************************************
 * Caleydo - Visualization for Molecular Biology - http://caleydo.org
 * Copyright (c) The Caleydo Team. All rights reserved.
 * Licensed under the new BSD license, available at http://caleydo.org/license
 **************************************************************************** */

import './style.scss';
import 'lineupjs/src/style.scss';
import 'font-awesome/scss/font-awesome.scss';
import {onDOMNodeRemoved, mixin} from 'phovea_core/src';
import {Range} from 'phovea_core/src/range';
import {ITable} from 'phovea_core/src/table/ITable';
import {
  VALUE_TYPE_CATEGORICAL, VALUE_TYPE_INT, VALUE_TYPE_REAL,
  ICategoricalValueTypeDesc, INumberValueTypeDesc
} from 'phovea_core/src/datatype';
import {defaultSelectionType, hoverSelectionType} from 'phovea_core/src/idtype';
import {AVisInstance, IVisInstance, assignVis, IVisInstanceOptions} from 'phovea_core/src/vis';
import LineUpImpl,{ILineUpConfig} from 'lineupjs/src/lineup';
import {LocalDataProvider} from 'lineupjs/src/provider';
import {IColumnDesc} from 'lineupjs/src/model/Column';

function deriveColumns(columns: any[]): IColumnDesc[] {
  return columns.map((col) => {
    const desc: any = col.desc;
    let r: any = {
      column: col.desc.name
    };
    if (desc.color) {
      r.color = desc.color;
    } else if (desc.cssClass) {
      r.cssClass = desc.cssClass;
    }

    //use magic word to find extra attributes
    if (desc.lineup) {
      Object.assign(r, desc.lineup);
    }
    const val = col.desc.value;
    switch (val.type) {
      case VALUE_TYPE_CATEGORICAL:
        r.type = 'categorical';
        r.categories = (<ICategoricalValueTypeDesc>(val)).categories;
        break;
      case VALUE_TYPE_INT:
      case VALUE_TYPE_REAL:
        r.type = 'number';
        r.domain = (<INumberValueTypeDesc>val).range;
        break;
      default:
        r.type = 'string';
        break;
    }
    return <IColumnDesc>r;
  });
}

export interface ILineUpOptions extends IVisInstanceOptions {
  rowNames?: boolean;
  dump?: any;
  lineup?: ILineUpConfig;

  sortCriteria?: {column: string, asc: boolean};
}

export class LineUp extends AVisInstance implements IVisInstance {
  private readonly options: ILineUpOptions = {
    rowNames: false
  };

  private readonly _node: HTMLDivElement;
  private lineup: LineUpImpl;
  private provider: LocalDataProvider;

  constructor(public readonly data: ITable, parent: Element, options: ILineUpOptions = {}) {
    super();
    mixin(this.options, options);

    this._node = this.build();
    parent.appendChild(this._node);
    assignVis(this._node, this);
  }

  get rawSize(): [number, number] {
    const dim = this.data.dim;
    return [Math.min(dim[1] * 100, 1000), Math.min(dim[0] * 20, 600)];
  }

  get node() {
    return this._node;
  }

  private build() {
    const div = document.createElement('div');
    const rowNames = this.options.rowNames === true;
    const columns = deriveColumns(this.data.cols());

    if (rowNames) {
      columns.unshift(<any>{type: 'string', label: 'Row', column: '_name'});
    }

    const listener = (event, act: Range) => {
      if (this.lineup) {
        this.lineup.data.setSelection(act.dim(0).asList());
      }
    };
    this.data.on('select-selected', listener);
    onDOMNodeRemoved(div, () => {
      this.data.off('select-selected', listener);
    });

    // bind data to chart
    Promise.all(<any[]>[this.data.objects(), this.data.rowIds(), rowNames ? this.data.rows() : Promise.resolve([])]).then((promise) => {
      const arr: any[] = promise[0];
      const rowIds: number[] = promise[1].dim(0).asList();
      const names: string[] = promise[2];

      const data = arr.map((obj, i) => {
        return mixin({
          _name: names[i],
          _id: rowIds[i]
        }, obj);
      });

      this.provider = new LocalDataProvider(data, columns);
      if (this.options.dump) {
        this.provider.restore(this.options.dump);
      }

      this.lineup = new LineUpImpl(div, this.provider, this.options.lineup);
      this.lineup.on(LineUpImpl.EVENT_SELECTION_CHANGED, (data_index) => {
        let id = null;
        if (data_index < 0) {
          this.data.clear(hoverSelectionType);
        } else {
          id = data[data_index]._id;
          this.data.select(hoverSelectionType, [data_index]);
        }
        this.fire(hoverSelectionType, id);
      });
      this.lineup.on(LineUpImpl.EVENT_MULTISELECTION_CHANGED, (data_indices) => {
        if (data_indices.length === 0) {
          this.data.clear(defaultSelectionType);
        } else {
          this.data.select(defaultSelectionType, data_indices);
        }
        this.fire(defaultSelectionType, data_indices.length === 0 ? null : data[data_indices[0]]._id);
      });
      this.provider.deriveDefault();


      const sortCriteria = this.options.sortCriteria;
      if (sortCriteria) {
        this.lineup.sortBy((d) => d.label === sortCriteria.column, sortCriteria.asc);
      }

      this.lineup.update();
      this.data.selections().then((act) => {
        if (!act.isNone) {
          listener(null, act);
        }
      });

      this.markReady();
    });

    return div;
  }

  transform(scale?: [number, number], rotate?: number) {
    const bak = {
      scale: this.options.scale || [1, 1],
      rotate: this.options.rotate || 0
    };
    if (arguments.length === 0) {
      return bak;
    }
    this.node.style.transform = `rotate(${rotate}deg)scale(${scale[0]},${scale[1]})`;
    const new_ = { scale, rotate };
    this.fire('transform', new_, bak);
    this.options.scale = scale;
    this.options.rotate = rotate;
    return new_;
  }

  update() {
    if (this.lineup) {
      this.lineup.update();
    }
  }
}

export function create(data: ITable, parent: Element, options?: ILineUpOptions) {
  return new LineUp(data, parent, options);
}
