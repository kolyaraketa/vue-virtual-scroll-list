/*!
 * vue-virtual-scroll-list v2.3.3
 * open source under the MIT license
 * https://github.com/tangbc/vue-virtual-scroll-list#readme
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('vue')) :
  typeof define === 'function' && define.amd ? define(['vue'], factory) :
  (global = global || self, global.VirtualList = factory(global.Vue));
}(this, (function (vue) { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  /**
   * virtual list core calculating center
   */
  var DIRECTION_TYPE = {
    FRONT: 'FRONT',
    // scroll up or left
    BEHIND: 'BEHIND' // scroll down or right

  };
  var CALC_TYPE = {
    INIT: 'INIT',
    FIXED: 'FIXED',
    DYNAMIC: 'DYNAMIC'
  };
  var LEADING_BUFFER = 0;

  var Virtual = /*#__PURE__*/function () {
    function Virtual(param, callUpdate) {
      _classCallCheck(this, Virtual);

      this.init(param, callUpdate);
    }

    _createClass(Virtual, [{
      key: "init",
      value: function init(param, callUpdate) {
        // param data
        this.param = param;
        this.callUpdate = callUpdate; // size data

        this.sizes = new Map();
        this.firstRangeTotalSize = 0;
        this.firstRangeAverageSize = 0;
        this.lastCalcIndex = 0;
        this.fixedSizeValue = 0;
        this.calcType = CALC_TYPE.INIT; // scroll data

        this.offset = 0;
        this.direction = ''; // range data

        this.range = Object.create(null);

        if (param) {
          this.checkRange(0, param.keeps - 1);
        } // benchmark test data
        // this.__bsearchCalls = 0
        // this.__getIndexOffsetCalls = 0

      }
    }, {
      key: "destroy",
      value: function destroy() {
        this.init(null, null);
      } // return current render range

    }, {
      key: "getRange",
      value: function getRange() {
        var range = Object.create(null);
        range.start = this.range.start;
        range.end = this.range.end;
        range.padFront = this.range.padFront;
        range.padBehind = this.range.padBehind;
        return range;
      }
    }, {
      key: "isBehind",
      value: function isBehind() {
        return this.direction === DIRECTION_TYPE.BEHIND;
      }
    }, {
      key: "isFront",
      value: function isFront() {
        return this.direction === DIRECTION_TYPE.FRONT;
      } // return start index offset

    }, {
      key: "getOffset",
      value: function getOffset(start) {
        return (start < 1 ? 0 : this.getIndexOffset(start)) + this.param.slotHeaderSize;
      }
    }, {
      key: "updateParam",
      value: function updateParam(key, value) {
        var _this = this;

        if (this.param && key in this.param) {
          // if uniqueIds change, find out deleted id and remove from size map
          if (key === 'uniqueIds') {
            this.sizes.forEach(function (v, key) {
              if (!value.includes(key)) {
                _this.sizes["delete"](key);
              }
            });
          }

          this.param[key] = value;
        }
      } // save each size map by id

    }, {
      key: "saveSize",
      value: function saveSize(id, size) {
        this.sizes.set(id, size); // we assume size type is fixed at the beginning and remember first size value
        // if there is no size value different from this at next comming saving
        // we think it's a fixed size list, otherwise is dynamic size list

        if (this.calcType === CALC_TYPE.INIT) {
          this.fixedSizeValue = size;
          this.calcType = CALC_TYPE.FIXED;
        } else if (this.calcType === CALC_TYPE.FIXED && this.fixedSizeValue !== size) {
          this.calcType = CALC_TYPE.DYNAMIC; // it's no use at all

          delete this.fixedSizeValue;
        } // calculate the average size only in the first range


        if (this.calcType !== CALC_TYPE.FIXED && typeof this.firstRangeTotalSize !== 'undefined') {
          if (this.sizes.size < Math.min(this.param.keeps, this.param.uniqueIds.length)) {
            this.firstRangeTotalSize = _toConsumableArray(this.sizes.values()).reduce(function (acc, val) {
              return acc + val;
            }, 0);
            this.firstRangeAverageSize = Math.round(this.firstRangeTotalSize / this.sizes.size);
          } else {
            // it's done using
            delete this.firstRangeTotalSize;
          }
        }
      } // in some special situation (e.g. length change) we need to update in a row
      // try goiong to render next range by a leading buffer according to current direction

    }, {
      key: "handleDataSourcesChange",
      value: function handleDataSourcesChange() {
        var start = this.range.start;

        if (this.isFront()) {
          start = start - LEADING_BUFFER;
        } else if (this.isBehind()) {
          start = start + LEADING_BUFFER;
        }

        start = Math.max(start, 0);
        this.updateRange(this.range.start, this.getEndByStart(start));
      } // when slot size change, we also need force update

    }, {
      key: "handleSlotSizeChange",
      value: function handleSlotSizeChange() {
        this.handleDataSourcesChange();
      } // calculating range on scroll

    }, {
      key: "handleScroll",
      value: function handleScroll(offset) {
        this.direction = offset < this.offset ? DIRECTION_TYPE.FRONT : DIRECTION_TYPE.BEHIND;
        this.offset = offset;

        if (!this.param) {
          return;
        }

        if (this.direction === DIRECTION_TYPE.FRONT) {
          this.handleFront();
        } else if (this.direction === DIRECTION_TYPE.BEHIND) {
          this.handleBehind();
        }
      } // ----------- public method end -----------

    }, {
      key: "handleFront",
      value: function handleFront() {
        var overs = this.getScrollOvers(); // should not change range if start doesn't exceed overs

        if (overs > this.range.start) {
          return;
        } // move up start by a buffer length, and make sure its safety


        var start = Math.max(overs - this.param.buffer, 0);
        this.checkRange(start, this.getEndByStart(start));
      }
    }, {
      key: "handleBehind",
      value: function handleBehind() {
        var overs = this.getScrollOvers(); // range should not change if scroll overs within buffer

        if (overs < this.range.start + this.param.buffer) {
          return;
        }

        this.checkRange(overs, this.getEndByStart(overs));
      } // return the pass overs according to current scroll offset

    }, {
      key: "getScrollOvers",
      value: function getScrollOvers() {
        // if slot header exist, we need subtract its size
        var offset = this.offset - this.param.slotHeaderSize;

        if (offset <= 0) {
          return 0;
        } // if is fixed type, that can be easily


        if (this.isFixedType()) {
          return Math.floor(offset / this.fixedSizeValue);
        }

        var low = 0;
        var middle = 0;
        var middleOffset = 0;
        var high = this.param.uniqueIds.length;

        while (low <= high) {
          // this.__bsearchCalls++
          middle = low + Math.floor((high - low) / 2);
          middleOffset = this.getIndexOffset(middle);

          if (middleOffset === offset) {
            return middle;
          } else if (middleOffset < offset) {
            low = middle + 1;
          } else if (middleOffset > offset) {
            high = middle - 1;
          }
        }

        return low > 0 ? --low : 0;
      } // return a scroll offset from given index, can efficiency be improved more here?
      // although the call frequency is very high, its only a superposition of numbers

    }, {
      key: "getIndexOffset",
      value: function getIndexOffset(givenIndex) {
        if (!givenIndex) {
          return 0;
        }

        var offset = 0;
        var indexSize = 0;

        for (var index = 0; index < givenIndex; index++) {
          // this.__getIndexOffsetCalls++
          indexSize = this.sizes.get(this.param.uniqueIds[index]);
          offset = offset + (typeof indexSize === 'number' ? indexSize : this.getEstimateSize());
        } // remember last calculate index


        this.lastCalcIndex = Math.max(this.lastCalcIndex, givenIndex - 1);
        this.lastCalcIndex = Math.min(this.lastCalcIndex, this.getLastIndex());
        return offset;
      } // is fixed size type

    }, {
      key: "isFixedType",
      value: function isFixedType() {
        return this.calcType === CALC_TYPE.FIXED;
      } // return the real last index

    }, {
      key: "getLastIndex",
      value: function getLastIndex() {
        return this.param.uniqueIds.length - 1;
      } // in some conditions range is broke, we need correct it
      // and then decide whether need update to next range

    }, {
      key: "checkRange",
      value: function checkRange(start, end) {
        var keeps = this.param.keeps;
        var total = this.param.uniqueIds.length; // datas less than keeps, render all

        if (total <= keeps) {
          start = 0;
          end = this.getLastIndex();
        } else if (end - start < keeps - 1) {
          // if range length is less than keeps, corrent it base on end
          start = end - keeps + 1;
        }

        if (this.range.start !== start) {
          this.updateRange(start, end);
        }
      } // setting to a new range and rerender

    }, {
      key: "updateRange",
      value: function updateRange(start, end) {
        this.range.start = start;
        this.range.end = end;
        this.range.padFront = this.getPadFront();
        this.range.padBehind = this.getPadBehind();
        this.callUpdate(this.getRange());
      } // return end base on start

    }, {
      key: "getEndByStart",
      value: function getEndByStart(start) {
        var theoryEnd = start + this.param.keeps - 1;
        var truelyEnd = Math.min(theoryEnd, this.getLastIndex());
        return truelyEnd;
      } // return total front offset

    }, {
      key: "getPadFront",
      value: function getPadFront() {
        if (this.isFixedType()) {
          return this.fixedSizeValue * this.range.start;
        } else {
          return this.getIndexOffset(this.range.start);
        }
      } // return total behind offset

    }, {
      key: "getPadBehind",
      value: function getPadBehind() {
        var end = this.range.end;
        var lastIndex = this.getLastIndex();

        if (this.isFixedType()) {
          return (lastIndex - end) * this.fixedSizeValue;
        } // if it's all calculated, return the exactly offset


        if (this.lastCalcIndex === lastIndex) {
          return this.getIndexOffset(lastIndex) - this.getIndexOffset(end);
        } else {
          // if not, use a estimated value
          return (lastIndex - end) * this.getEstimateSize();
        }
      } // get the item estimate size

    }, {
      key: "getEstimateSize",
      value: function getEstimateSize() {
        return this.isFixedType() ? this.fixedSizeValue : this.firstRangeAverageSize || this.param.estimateSize;
      }
    }]);

    return Virtual;
  }();

  /**
   * props declaration for default, item and slot component
   */
  var VirtualProps = {
    dataKey: {
      type: [String, Function],
      required: true
    },
    dataSources: {
      type: Array,
      required: true
    },
    dataComponent: {
      type: [Object, Function],
      required: true
    },
    keeps: {
      type: Number,
      "default": 30
    },
    extraProps: {
      type: Object
    },
    estimateSize: {
      type: Number,
      "default": 50
    },
    direction: {
      type: String,
      "default": 'vertical' // the other value is horizontal

    },
    start: {
      type: Number,
      "default": 0
    },
    offset: {
      type: Number,
      "default": 0
    },
    topThreshold: {
      type: Number,
      "default": 0
    },
    bottomThreshold: {
      type: Number,
      "default": 0
    },
    pageMode: {
      type: Boolean,
      "default": false
    },
    rootTag: {
      type: String,
      "default": 'div'
    },
    wrapTag: {
      type: String,
      "default": 'div'
    },
    wrapClass: {
      type: String,
      "default": ''
    },
    wrapStyle: {
      type: Object
    },
    itemTag: {
      type: String,
      "default": 'div'
    },
    itemClass: {
      type: String,
      "default": ''
    },
    itemClassAdd: {
      type: Function
    },
    itemStyle: {
      type: Object
    },
    headerTag: {
      type: String,
      "default": 'div'
    },
    headerClass: {
      type: String,
      "default": ''
    },
    headerStyle: {
      type: Object
    },
    footerTag: {
      type: String,
      "default": 'div'
    },
    footerClass: {
      type: String,
      "default": ''
    },
    footerStyle: {
      type: Object
    },
    itemScopedSlots: {
      type: Object
    }
  };
  var ItemProps = {
    index: {
      type: Number
    },
    event: {
      type: String
    },
    tag: {
      type: String
    },
    horizontal: {
      type: Boolean
    },
    source: {
      type: Object
    },
    component: {
      type: [Object, Function]
    },
    slotComponent: {
      type: Function
    },
    emit: {
      type: Function
    },
    uniqueKey: {
      type: [String, Number]
    },
    extraProps: {
      type: Object
    },
    scopedSlots: {
      type: Object
    },
    range: {
      type: Object
    }
  };
  var SlotProps = {
    event: {
      type: String
    },
    uniqueKey: {
      type: String
    },
    tag: {
      type: String
    },
    horizontal: {
      type: Boolean
    },
    emit: {
      type: Function
    }
  };

  var Wrapper = {
    created: function created() {
      this.shapeKey = this.horizontal ? 'offsetWidth' : 'offsetHeight';
    },
    mounted: function mounted() {
      var _this = this;

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(function () {
          _this.dispatchSizeChange();
        });
        this.resizeObserver.observe(this.$el);
      }
    },
    // since componet will be reused, so disptach when updated
    updated: function updated() {
      this.dispatchSizeChange();
    },
    beforeUnmount: function beforeUnmount() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    },
    methods: {
      getCurrentSize: function getCurrentSize() {
        return this.$el ? this.$el[this.shapeKey] : 0;
      },
      // tell parent current size identify by unqiue key
      dispatchSizeChange: function dispatchSizeChange() {
        this.emit(this.event, this.uniqueKey, this.getCurrentSize(), this.hasInitial);
      }
    }
  }; // wrapping for item

  var Item = vue.defineComponent({
    name: 'VirtualListItem',
    mixins: [Wrapper],
    props: ItemProps,
    setup: function setup(props) {
      var tag = props.tag,
          _props$extraProps = props.extraProps,
          extraProps = _props$extraProps === void 0 ? {} : _props$extraProps,
          index = props.index,
          source = props.source,
          _props$scopedSlots = props.scopedSlots,
          scopedSlots = _props$scopedSlots === void 0 ? {} : _props$scopedSlots,
          uniqueKey = props.uniqueKey,
          component = props.component,
          slotComponent = props.slotComponent;

      var propsInner = _objectSpread2({}, extraProps, {
        source: source,
        index: index
      });

      return function () {
        return vue.h(tag, {
          key: uniqueKey,
          role: 'listitem'
        }, [typeof slotComponent === 'function' ? vue.h('div', slotComponent({
          item: source,
          index: index,
          scope: props
        })) : vue.h(component, _objectSpread2({}, propsInner, {
          scopedSlots: scopedSlots
        }))]);
      };
    }
  }); // wrapping for slot

  var Slot = vue.defineComponent({
    name: 'VirtualListSlot',
    mixins: [Wrapper],
    props: SlotProps,
    render: function render() {
      return vue.h(this.tag, {}, this.$slots["default"]());
    }
  });

  var EVENT_TYPE = {
    ITEM: 'item_resize',
    SLOT: 'slot_resize'
  };
  var SLOT_TYPE = {
    HEADER: 'thead',
    // string value also use for aria role attribute
    FOOTER: 'tfoot'
  }; // get the real render slots based on range data
  // in-place patch strategy will try to reuse components as possible
  // so those components that are reused will not trigger lifecycle mounted

  var getRenderSlots = function getRenderSlots(_ref) {
    var props = _ref.props,
        range = _ref.range,
        $slots = _ref.$slots,
        emit = _ref.emit;
    var slots = [];
    var dataSources = props.dataSources,
        dataKey = props.dataKey,
        itemClass = props.itemClass,
        itemTag = props.itemTag,
        itemStyle = props.itemStyle,
        isHorizontal = props.isHorizontal,
        extraProps = props.extraProps,
        dataComponent = props.dataComponent,
        itemScopedSlots = props.itemScopedSlots;
    var slotComponent = $slots && $slots.item;

    for (var index = range.start; index <= range.end; index++) {
      var dataSource = dataSources[index];

      if (dataSource) {
        var uniqueKey = typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey];

        if (typeof uniqueKey === 'string' || typeof uniqueKey === 'number') {
          slots.push(vue.h(Item, {
            index: index,
            emit: emit,
            tag: itemTag,
            event: EVENT_TYPE.ITEM,
            horizontal: isHorizontal,
            uniqueKey: uniqueKey,
            source: dataSource,
            extraProps: extraProps,
            component: dataComponent,
            slotComponent: slotComponent,
            scopedSlots: itemScopedSlots,
            range: range,
            key: uniqueKey,
            style: itemStyle,
            "class": "".concat(itemClass).concat(props.itemClassAdd ? ' ' + props.itemClassAdd(index) : '')
          }));
        } else {
          console.warn("Cannot get the data-key '".concat(dataKey, "' from data-sources."));
        }
      } else {
        console.warn("Cannot get the index '".concat(index, "' from data-sources."));
      }
    }

    return slots;
  };

  var VirtualListComponent = vue.defineComponent({
    props: VirtualProps,
    components: {
      Item: Item,
      Slot: Slot
    },
    data: function data() {
      return {
        // range: null
        root: null,
        shepherd: null
      };
    },
    watch: {
      'dataSources.length': {
        handler: function handler() {
          this.virtual.updateParam('uniqueIds', this.getUniqueIdFromDataSources(this.dataKey, this.dataSources));
          this.virtual.handleDataSourcesChange();
        },
        deep: true
      },
      keeps: function keeps(newValue) {
        this.virtual.updateParam('keeps', newValue);
        this.virtual.handleSlotSizeChange();
      },
      start: function start(newValue) {
        this.scrollToIndex(newValue);
      },
      offset: function offset(newValue) {
        this.scrollToOffset(newValue);
      }
    },
    // set back offset when awake from keep-alive
    activated: function activated() {
      this.scrollToOffset(this.virtual.offset);
    },
    mounted: function mounted() {
      this.root = document.getElementById('vvsl-root');
      this.shepart = document.getElementById('vvsl-shepart'); // set position

      if (this.start) {
        this.scrollToIndex(this.start);
      } else if (this.offset) {
        this.scrollToOffset(this.offset);
      } // in page mode we bind scroll event to document


      if (this.pageMode) {
        this.updatePageModeFront();
        document.addEventListener('scroll', this.onScroll, {
          passive: false
        });
      }
    },
    beforeUnmount: function beforeUnmount() {
      this.virtual.destroy();

      if (this.pageMode) {
        document.removeEventListener('scroll', this.onScroll);
      }
    },
    methods: {
      // get item size by id
      getSize: function getSize(id) {
        return this.virtual.sizes.get(id);
      },
      // get the total number of stored (rendered) items
      getSizes: function getSizes() {
        return this.virtual.sizes.size;
      },
      // set current scroll position to a expectant offset
      scrollToOffset: function scrollToOffset(offset) {
        if (this.pageMode) {
          document.body[this.directionKey] = offset;
          document.documentElement[this.directionKey] = offset;
        } else {
          var root = this.root;

          if (root) {
            root[this.directionKey] = offset;
          }
        }
      },
      // set current scroll position to a expectant index
      scrollToIndex: function scrollToIndex(index) {
        // scroll to bottom
        if (index >= this.dataSources.length - 1) {
          this.scrollToBottom();
        } else {
          var offset = this.virtual.getOffset(index);
          this.scrollToOffset(offset);
        }
      },
      // set current scroll position to bottom
      scrollToBottom: function scrollToBottom() {
        var _this = this;

        var shepherd = this.shepherd;

        if (shepherd) {
          var offset = shepherd[this.isHorizontal ? 'offsetLeft' : 'offsetTop'];
          this.scrollToOffset(offset); // check if it's really scrolled to the bottom
          // maybe list doesn't render and calculate to last range
          // so we need retry in next event loop until it really at bottom

          setTimeout(function () {
            var el = _this.root;

            if (_this.getOffset(el, _this.pageMode, _this.directionKey) + _this.getClientSize(el, _this.pageMode, _this.isHorizontal) < _this.getScrollSize(el, _this.pageMode, _this.isHorizontal)) {
              _this.scrollToBottom();
            }
          }, 3);
        }
      },
      // when using page mode we need update slot header size manually
      // taking root offset relative to the browser as slot header size
      updatePageModeFront: function updatePageModeFront() {
        var root = this.root;

        if (root) {
          var rect = root.getBoundingClientRect();
          var defaultView = root.ownerDocument.defaultView;
          var offsetFront = this.isHorizontal ? rect.left + defaultView.pageXOffset : rect.top + defaultView.pageYOffset;
          this.virtual.updateParam('slotHeaderSize', offsetFront);
        }
      },
      // reset all state back to initial
      reset: function reset() {
        this.virtual.destroy();
        this.scrollToOffset(0);
        this.installVirtual();
      },
      // ----------- public method end -----------
      // event called when slot mounted or size changed
      onSlotResized: function onSlotResized(type, size, hasInit) {
        if (type === SLOT_TYPE.HEADER) {
          this.virtual.updateParam('slotHeaderSize', size);
        } else if (type === SLOT_TYPE.FOOTER) {
          this.virtual.updateParam('slotFooterSize', size);
        }

        if (hasInit) {
          this.virtual.handleSlotSizeChange();
        }
      }
    },
    setup: function setup(props, _ref2) {
      var emit = _ref2.emit,
          slots = _ref2.slots,
          expose = _ref2.expose;
      var range = vue.ref({
        start: 0,
        end: 0,
        padFront: 0,
        padBehind: 0
      });
      var virtual = vue.ref(null);
      var isHorizontal = vue.ref(null);
      var directionKey = vue.ref(null);
      var test = vue.ref(0);

      var getUniqueIdFromDataSources = function getUniqueIdFromDataSources(dataKey, dataSources) {
        return dataSources.map(function (dataSource) {
          return typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey];
        });
      }; // here is the rerendering entry


      var onRangeChanged = function onRangeChanged(r) {
        range.value = r;
      };

      var installVirtual = function installVirtual() {
        var virtual = new Virtual({
          slotHeaderSize: 0,
          slotFooterSize: 0,
          keeps: props.keeps,
          estimateSize: props.estimateSize,
          buffer: Math.round(props.keeps / 3),
          // recommend for a third of keeps
          uniqueIds: getUniqueIdFromDataSources(props.dataKey, props.dataSources)
        }, onRangeChanged);
        return {
          virtual: virtual,
          value: virtual.getRange()
        };
      };

      var header = slots.header,
          footer = slots.footer;
      var pageMode = props.pageMode,
          rootTag = props.rootTag,
          wrapClass = props.wrapClass,
          wrapStyle = props.wrapStyle,
          headerTag = props.headerTag,
          headerClass = props.headerClass,
          headerStyle = props.headerStyle,
          footerTag = props.footerTag,
          footerClass = props.footerClass,
          footerStyle = props.footerStyle,
          topThreshold = props.topThreshold;
      isHorizontal.value = props.direction === 'horizontal';
      directionKey.value = isHorizontal.value ? 'scrollLeft' : 'scrollTop';
      var newVirtual = installVirtual();
      virtual.value = newVirtual.virtual;
      range.value = newVirtual.value; // event called when each item mounted or size changed
      // const onItemResized = (id, size) => {
      //   virtual.value.saveSize(id, size)
      //   emit('resized', id, size)
      // }
      // listen item size change
      // this.$on(EVENT_TYPE.ITEM, this.onItemResized)
      // listen slot size change
      // if (this.$slots.header || this.$slots.footer) {
      //   this.$on(EVENT_TYPE.SLOT, this.onSlotResized)
      // }
      // emit event in special position

      var emitEvent = function emitEvent(offset, clientSize, scrollSize, evt, dataSources) {
        emit('scroll', evt, virtual.value.getRange());

        if (virtual.value.isFront() && !!dataSources.length && offset - topThreshold <= 0) {
          emit('totop');
        } else if (virtual.value.isBehind() && offset + clientSize >= scrollSize) {
          emit('tobottom');
        }
      };

      var onScroll = function onScroll(e) {
        var offset = getOffset(e.target, pageMode, directionKey.value);
        var clientSize = getClientSize(e.target, pageMode, isHorizontal.value);
        var scrollSize = getScrollSize(e.target, pageMode, isHorizontal.value); // iOS scroll-spring-back behavior will make direction mistake

        if (offset < 0 || offset + clientSize > scrollSize + 1 || !scrollSize) {
          return;
        }

        test.value++;
        virtual.value.handleScroll(offset);
        emitEvent(offset, clientSize, scrollSize, e, props.dataSources);
      }; // return current scroll offset


      var getOffset = function getOffset(el, pageMode, directionKey) {
        if (pageMode) {
          return document.documentElement[directionKey] || document.body[directionKey];
        } else {
          return el ? Math.ceil(el[directionKey]) : 0;
        }
      }; // return client viewport size


      var getClientSize = function getClientSize(el, pageMode, isHorizontal) {
        var key = isHorizontal ? 'clientWidth' : 'clientHeight';

        if (pageMode) {
          return document.documentElement[key] || document.body[key];
        } else {
          return el ? Math.ceil(el[key]) : 0;
        }
      }; // return all scroll size


      var getScrollSize = function getScrollSize(el, pageMode, isHorizontal) {
        var key = isHorizontal ? 'scrollWidth' : 'scrollHeight';

        if (pageMode) {
          return document.documentElement[key] || document.body[key];
        } else {
          return el ? Math.ceil(el[key]) : 0;
        }
      };

      expose({
        range: range,
        virtual: virtual,
        isHorizontal: isHorizontal,
        directionKey: directionKey,
        onScroll: onScroll,
        emitEvent: emitEvent,
        getOffset: getOffset,
        getClientSize: getClientSize,
        getScrollSize: getScrollSize,
        installVirtual: installVirtual,
        getUniqueIdFromDataSources: getUniqueIdFromDataSources
      });
      return function () {
        return vue.h(rootTag, {
          onScroll: !pageMode && onScroll,
          "class": 'vvsl-root'
        }, [// header slot
        header ? vue.h(Slot, {
          "class": headerClass,
          style: headerStyle,
          tag: headerTag,
          event: EVENT_TYPE.SLOT,
          uniqueKey: SLOT_TYPE.HEADER
        }, header) : null, vue.h(props.wrapTag, {
          "class": wrapClass,
          role: 'group',
          style: _objectSpread2({}, wrapStyle, {
            padding: isHorizontal.value ? "0px ".concat(range.value.padBehind, "px 0px ").concat(range.value.padFront, "px") : "".concat(range.value.padFront, "px 0px ").concat(range.value.padBehind, "px")
          })
        }, getRenderSlots({
          props: props,
          range: range.value,
          $slots: slots,
          emit: emit
        })), // footer slot
        footer ? vue.h(Slot, {
          "class": footerClass,
          style: footerStyle,
          props: {
            tag: footerTag,
            event: EVENT_TYPE.SLOT,
            uniqueKey: SLOT_TYPE.FOOTER
          }
        }, footer) : null, // an empty element use to scroll to bottom
        vue.h('div', {
          "class": 'vvsl-shepart',
          style: {
            width: isHorizontal.value ? '0px' : '100%',
            height: isHorizontal.value ? '100%' : '0px'
          }
        })]);
      };
    }
  });

  return VirtualListComponent;

})));
