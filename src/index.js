/**
 * virtual list default component
 */

import { defineComponent, h, ref, watch, onActivated, onMounted, onBeforeUnmount } from 'vue'
import Virtual from './virtual'
import { Item, Slot } from './item'
import { VirtualProps } from './props'

const ID_EL = {
  ROOT: 'vlist-root',
  SHEPHERD: 'vlist-shepherd'
}
const EVENT_TYPE = {
  ITEM: 'item_resize',
  SLOT: 'slot_resize'
}
const SLOT_TYPE = {
  HEADER: 'thead', // string value also use for aria role attribute
  FOOTER: 'tfoot'
}

// get the real render slots based on range data
// in-place patch strategy will try to reuse components as possible
// so those components that are reused will not trigger lifecycle mounted
const getRenderSlots = ({ props, range, $slots, emit }) => {
  const slots = []
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
  for (let index = range.start; index <= range.end; index++) {
    const dataSource = dataSources[index]
    if (dataSource) {
      const uniqueKey = typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey]
      if (typeof uniqueKey === 'string' || typeof uniqueKey === 'number') {
        slots.push(
          h(Item, {
            index,
            emit,
            tag: itemTag,
            event: EVENT_TYPE.ITEM,
            horizontal: isHorizontal,
            uniqueKey: uniqueKey,
            source: dataSource,
            extraProps: extraProps,
            component: dataComponent,
            slotComponent,
            scopedSlots: itemScopedSlots,
            range,
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
  //     // range: null
  //     root: null,
  //     shepherd: null
  //   }
  // },

  setup (props, { emit, slots, expose }) {
    const range = ref({ start: 0, end: 0, padFront: 0, padBehind: 0 })
    const virtual = ref(null)
    const isHorizontal = ref(null)
    const directionKey = ref(null)
    const root = ref(null)
    const shepherd = ref(null)

    const getUniqueIdFromDataSources = (dataKey, dataSources) => {
      return dataSources.map((dataSource) =>
        typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey]
      )
    }

    // here is the rerendering entry
    const onRangeChanged = (r) => {
      range.value = r
    }

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

    const installNewVirtual = () => {
      const newVirtual = installVirtual()
      virtual.value = newVirtual.virtual
      range.value = newVirtual.value
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
    // const newVirtual = installVirtual()
    // virtual.value = newVirtual.virtual
    // range.value = newVirtual.value
    installNewVirtual()

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
      } else if (virtual.value.isBehind() && offset + clientSize >= scrollSize) {
        emit('tobottom')
      }
    }

    const onScroll = (e) => {
      const offset = getOffset(e.target, pageMode, directionKey.value)
      const clientSize = getClientSize(e.target, pageMode, isHorizontal.value)
      const scrollSize = getScrollSize(e.target, pageMode, isHorizontal.value)
      // iOS scroll-spring-back behavior will make direction mistake
      if (offset < 0 || offset + clientSize > scrollSize + 1 || !scrollSize) {
        return
      }
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

    // set current scroll position to a expectant offset
    const scrollToOffset = (offset) => {
      if (pageMode) {
        if (!document) return
        document.body[directionKey.value] = offset
        document.documentElement[directionKey.value] = offset
      } else {
        if (!root.value) {
          root.value = document.getElementById(ID_EL.ROOT)
        }
        root.value[directionKey.value] = offset
      }
    }

    // set current scroll position to bottom
    const scrollToBottom = () => {
      if (!shepherd.value) {
        shepherd.value = document.getElementById(ID_EL.SHEPHERD)
      }
      const offset = shepherd.value[isHorizontal.value ? 'offsetLeft' : 'offsetTop']
      scrollToOffset(offset)

      // check if it's really scrolled to the bottom
      // maybe list doesn't render and calculate to last range
      // so we need retry in next event loop until it really at bottom
      setTimeout(() => {
        const el = root.value
        if (
          el &&
          getOffset(el, pageMode.value, directionKey.value) +
            getClientSize(el, pageMode.value, isHorizontal.value) <
            getScrollSize(el, pageMode.value, isHorizontal.value)
        ) {
          scrollToBottom()
        }
      }, 3)
    }

    // set current scroll position to a expectant index
    const scrollToIndex = (index) => {
      // scroll to bottom
      if (index >= props.dataSources.length - 1) {
        scrollToBottom()
      } else {
        const offset = virtual.value.getOffset(index)
        scrollToOffset(offset)
      }
    }

    // // get item size by id
    // const getSize = id => virtual.value.sizes.get(id)

    // // get the total number of stored (rendered) items
    // const getSizes = () => virtual.value.sizes.size

    // reset all state back to initial
    const reset = () => {
      virtual.value.destroy()
      scrollToOffset(0)
      installNewVirtual()
    }

    // when using page mode we need update slot header size manually
    // taking root offset relative to the browser as slot header size
    const updatePageModeFront = () => {
      const r = root.value
      if (r) {
        const rect = r.getBoundingClientRect()
        const { defaultView } = r.ownerDocument
        const offsetFront = this.isHorizontal
          ? rect.left + defaultView.pageXOffset
          : rect.top + defaultView.pageYOffset
        virtual.updateParam('slotHeaderSize', offsetFront)
      }
    }

    // ----------- public method end -----------

    // event called when slot mounted or size changed
    const onSlotResized = (type, size, hasInit) => {
      if (type === SLOT_TYPE.HEADER) {
        virtual.updateParam('slotHeaderSize', size)
      } else if (type === SLOT_TYPE.FOOTER) {
        virtual.updateParam('slotFooterSize', size)
      }

      if (hasInit) {
        virtual.handleSlotSizeChange()
      }
    }

    onMounted(() => {
      // set position
      if (props.start) scrollToIndex(props.start)
      else if (props.offset) scrollToOffset(props.offset)
      // in page mode we bind scroll event to document
      if (pageMode.value) {
        updatePageModeFront()
        document.addEventListener('scroll', onScroll, { passive: false })
      }
    })

    onBeforeUnmount(() => {
      virtual.destroy()
      if (pageMode.value) document.removeEventListener('scroll', onScroll)
    })

    watch(() => props.dataSources.length, () => {
      virtual.updateParam(
        'uniqueIds',
        getUniqueIdFromDataSources(props.dataKey, props.dataSources)
      )
      virtual.handleDataSourcesChange()
    })
    watch(() => props.keeps, newValue => {
      virtual.updateParam('keeps', newValue)
      virtual.handleSlotSizeChange()
    })
    watch(() => props.start, newValue => scrollToIndex(newValue))
    watch(() => props.offset, newValue => scrollToOffset(newValue))
    onActivated(() => scrollToOffset(virtual.offset)) // set back offset when awake from keep-alive

    expose({
      range,
      reset,
      virtual,
      isHorizontal,
      directionKey,
      onScroll,
      emitEvent,
      getOffset,
      getClientSize,
      getScrollSize,
      scrollToIndex,
      installVirtual,
      scrollToOffset,
      updatePageModeFront,
      onSlotResized,
      scrollToBottom,
      getUniqueIdFromDataSources
    })

    return () =>
      h(rootTag, { onScroll: !pageMode && onScroll, id: ID_EL.ROOT }, [
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

        h(
          props.wrapTag,
          {
            class: wrapClass,
            role: 'group',
            style: {
              ...wrapStyle,
              padding: isHorizontal.value
                ? `0px ${range.value.padBehind}px 0px ${range.value.padFront}px`
                : `${range.value.padFront}px 0px ${range.value.padBehind}px`
            }
          },
          getRenderSlots({ props, range: range.value, $slots: slots, emit })
        ),

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
          id: ID_EL.SHEPHERD,
          style: {
            width: isHorizontal.value ? '0px' : '100%',
            height: isHorizontal.value ? '100%' : '0px'
          }
        })
      ])
  }
})

export default VirtualListComponent
