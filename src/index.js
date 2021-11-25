/**
 * virtual list default component
 */

import { defineComponent, h, ref } from 'vue'
import Virtual from './virtual'
import { Item, Slot } from './item'
import { VirtualProps } from './props'

const EVENT_TYPE = {
  ITEM: 'item_resize',
  SLOT: 'slot_resize'
}
const SLOT_TYPE = {
  HEADER: 'thead', // string value also use for aria role attribute
  FOOTER: 'tfoot'
}

const getRenderList = ({ props, wrapStyle, range, $slots, wrapClass, role, isHorizontal }) => {
  const { padFront, padBehind } = range
  const style = {
    ...wrapStyle,
    padding: isHorizontal
      ? `0px ${padBehind}px 0px ${padFront}px`
      : `${padFront}px 0px ${padBehind}px`
  }
  return h(
    props.wrapTag,
    { class: wrapClass, role, style },
    getRenderSlots({ props, range, $slots })
  )
}

// get the real render slots based on range data
// in-place patch strategy will try to reuse components as possible
// so those components that are reused will not trigger lifecycle mounted
const getRenderSlots = ({ props, range, $slots }) => {
  console.log('🚀 ~ getRenderSlots ~ range', range)
  const slots = []
  const { start, end } = range
  const {
    dataSources,
    dataKey,
    itemClass,
    itemTag,
    itemStyle,
    isHorizontal,
    extraProps,
    dataComponent,
    itemScopedSlots
  } = props
  const slotComponent = $slots && $slots.item
  for (let index = start; index <= end; index++) {
    const dataSource = dataSources[index]
    if (dataSource) {
      const uniqueKey =
        typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey]
      if (typeof uniqueKey === 'string' || typeof uniqueKey === 'number') {
        slots.push(
          h(Item, {
            index,
            tag: itemTag,
            event: EVENT_TYPE.ITEM,
            horizontal: isHorizontal,
            uniqueKey: uniqueKey,
            source: dataSource,
            extraProps: extraProps,
            component: dataComponent,
            slotComponent,
            scopedSlots: itemScopedSlots,
            key: uniqueKey,
            style: itemStyle,
            class: `${itemClass}${props.itemClassAdd ? ' ' + props.itemClassAdd(index) : ''}`
          })
        )
      } else {
        console.warn(`Cannot get the data-key '${dataKey}' from data-sources.`)
      }
    } else {
      console.warn(`Cannot get the index '${index}' from data-sources.`)
    }
  }
  return slots
}

const VirtualListComponent = defineComponent({
  props: VirtualProps,

  components: { Item, Slot },

  // data () {
  //   return {
  //     range: null
  //   }
  // },

  watch: {
    'dataSources.length': {
      handler () {
        this.virtual.updateParam('uniqueIds', this.getUniqueIdFromDataSources(this.dataKey, this.dataSources))
        this.virtual.handleDataSourcesChange()
      },
      deep: true
    },

    keeps (newValue) {
      this.virtual.updateParam('keeps', newValue)
      this.virtual.handleSlotSizeChange()
    },

    start (newValue) {
      this.scrollToIndex(newValue)
    },

    offset (newValue) {
      this.scrollToOffset(newValue)
    }
  },

  // set back offset when awake from keep-alive
  activated () {
    this.scrollToOffset(this.virtual.offset)
  },

  mounted () {
    this.root = document.getElementById('vvsl-root')
    // set position
    if (this.start) {
      this.scrollToIndex(this.start)
    } else if (this.offset) {
      this.scrollToOffset(this.offset)
    }

    // in page mode we bind scroll event to document
    if (this.pageMode) {
      this.updatePageModeFront()

      document.addEventListener('scroll', this.onScroll, { passive: false })
    }
  },

  beforeUnmount () {
    this.virtual.destroy()
    if (this.pageMode) {
      document.removeEventListener('scroll', this.onScroll)
    }
  },

  methods: {
    // get item size by id
    getSize (id) {
      return this.virtual.sizes.get(id)
    },

    // get the total number of stored (rendered) items
    getSizes () {
      return this.virtual.sizes.size
    },

    // set current scroll position to a expectant offset
    scrollToOffset (offset) {
      if (this.pageMode) {
        document.body[this.directionKey] = offset
        document.documentElement[this.directionKey] = offset
      } else {
        const root = this.root
        if (root) {
          root[this.directionKey] = offset
        }
      }
    },

    // set current scroll position to a expectant index
    scrollToIndex (index) {
      // scroll to bottom
      if (index >= this.dataSources.length - 1) {
        this.scrollToBottom()
      } else {
        const offset = this.virtual.getOffset(index)
        this.scrollToOffset(offset)
      }
    },

    // set current scroll position to bottom
    scrollToBottom () {
      const { shepherd } = this.$refs
      if (shepherd) {
        const offset = shepherd[this.isHorizontal ? 'offsetLeft' : 'offsetTop']
        this.scrollToOffset(offset)

        // check if it's really scrolled to the bottom
        // maybe list doesn't render and calculate to last range
        // so we need retry in next event loop until it really at bottom
        setTimeout(() => {
          const el = this.$refs.root
          if (this.getOffset(el, this.pageMode, this.directionKey) + this.getClientSize(el, this.pageMode, this.isHorizontal) < this.getScrollSize(el, this.pageMode, this.isHorizontal)) {
            this.scrollToBottom()
          }
        }, 3)
      }
    },

    // when using page mode we need update slot header size manually
    // taking root offset relative to the browser as slot header size
    updatePageModeFront () {
      const root = this.root
      if (root) {
        const rect = root.getBoundingClientRect()
        const { defaultView } = root.ownerDocument
        const offsetFront = this.isHorizontal
          ? rect.left + defaultView.pageXOffset
          : rect.top + defaultView.pageYOffset
        this.virtual.updateParam('slotHeaderSize', offsetFront)
      }
    },

    // reset all state back to initial
    reset () {
      this.virtual.destroy()
      this.scrollToOffset(0)
      this.installVirtual()
    },

    // ----------- public method end -----------

    // event called when slot mounted or size changed
    onSlotResized (type, size, hasInit) {
      if (type === SLOT_TYPE.HEADER) {
        this.virtual.updateParam('slotHeaderSize', size)
      } else if (type === SLOT_TYPE.FOOTER) {
        this.virtual.updateParam('slotFooterSize', size)
      }

      if (hasInit) {
        this.virtual.handleSlotSizeChange()
      }
    }
  },

  setup (props, { emit, slots, expose }) {
    const virtual = ref(null)
    const range = ref(null)
    const isHorizontal = ref(null)
    const directionKey = ref(null)

    const getUniqueIdFromDataSources = (dataKey, dataSources) => {
      return dataSources.map((dataSource) =>
        typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey]
      )
    }

    // here is the rerendering entry
    const onRangeChanged = r => { range.value = r }

    const installVirtual = () => {
      const virtual = new Virtual(
        {
          slotHeaderSize: 0,
          slotFooterSize: 0,
          keeps: props.keeps,
          estimateSize: props.estimateSize,
          buffer: Math.round(props.keeps / 3), // recommend for a third of keeps
          uniqueIds: getUniqueIdFromDataSources(props.dataKey, props.dataSources)
        },
        onRangeChanged
      )
      return { virtual, value: virtual.getRange() }
    }

    const { header, footer } = slots
    const {
      pageMode,
      rootTag,
      wrapClass,
      wrapStyle,
      headerTag,
      headerClass,
      headerStyle,
      footerTag,
      footerClass,
      footerStyle,
      topThreshold
    } = props

    isHorizontal.value = props.direction === 'horizontal'
    directionKey.value = isHorizontal.value ? 'scrollLeft' : 'scrollTop'
    const newVirtual = installVirtual()
    virtual.value = newVirtual.virtual
    range.value = newVirtual.value

    // event called when each item mounted or size changed
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
    const emitEvent = (offset, clientSize, scrollSize, evt, dataSources) => {
      emit('scroll', evt, virtual.value.getRange())

      if (virtual.value.isFront() && !!dataSources.length && offset - topThreshold <= 0) {
        emit('totop')
      } else if (
        virtual.value.isBehind() &&
        offset + clientSize >= scrollSize
      ) {
        emit('tobottom')
      }
    }

    const onScroll = e => {
      const offset = getOffset(e.target, pageMode, directionKey.value)
      const clientSize = getClientSize(e.target, pageMode, isHorizontal.value)
      const scrollSize = getScrollSize(e.target, pageMode, isHorizontal.value)
      // iOS scroll-spring-back behavior will make direction mistake
      if (offset < 0 || offset + clientSize > scrollSize + 1 || !scrollSize) {
        return
      }
      console.log(offset)
      virtual.value.handleScroll(offset)
      emitEvent(offset, clientSize, scrollSize, e, props.dataSources)
    }

    // return current scroll offset
    const getOffset = (el, pageMode, directionKey) => {
      if (pageMode) {
        return document.documentElement[directionKey] || document.body[directionKey]
      } else {
        return el ? Math.ceil(el[directionKey]) : 0
      }
    }

    // return client viewport size
    const getClientSize = (el, pageMode, isHorizontal) => {
      const key = isHorizontal ? 'clientWidth' : 'clientHeight'
      if (pageMode) {
        return document.documentElement[key] || document.body[key]
      } else {
        return el ? Math.ceil(el[key]) : 0
      }
    }

    // return all scroll size
    const getScrollSize = (el, pageMode, isHorizontal) => {
      const key = isHorizontal ? 'scrollWidth' : 'scrollHeight'
      if (pageMode) {
        return document.documentElement[key] || document.body[key]
      } else {
        return el ? Math.ceil(el[key]) : 0
      }
    }

    expose({
      range,
      virtual,
      isHorizontal,
      directionKey,
      onScroll,
      emitEvent,
      getOffset,
      getClientSize,
      getScrollSize,
      installVirtual,
      getUniqueIdFromDataSources
    })

    return () => h(
      rootTag,
      {
        ref: 'root',
        onScroll: !pageMode && onScroll
      },
      [
        // header slot
        header
          ? h(
            Slot,
            {
              class: headerClass,
              style: headerStyle,
              tag: headerTag,
              event: EVENT_TYPE.SLOT,
              uniqueKey: SLOT_TYPE.HEADER
            },
            header
          )
          : null,

        // List
        getRenderList({ props, range: range.value, wrapStyle, $slots: slots, wrapClass, role: 'group', isHorizontal: isHorizontal.value }),

        // footer slot
        footer
          ? h(
            Slot,
            {
              class: footerClass,
              style: footerStyle,
              props: { tag: footerTag, event: EVENT_TYPE.SLOT, uniqueKey: SLOT_TYPE.FOOTER }
            },
            footer
          )
          : null,

        // an empty element use to scroll to bottom
        h('div', {
          ref: 'shepherd',
          style: { width: isHorizontal ? '0px' : '100%', height: isHorizontal ? '100%' : '0px' }
        })
      ]
    )
  }
})

export default VirtualListComponent
