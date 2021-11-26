/**
 * item and slot component both use similar wrapper
 * we need to know their size change at any time
 */

import { defineComponent, h } from 'vue'
import { ItemProps, SlotProps } from './props'

const Wrapper = {
  created () {
    this.shapeKey = this.horizontal ? 'offsetWidth' : 'offsetHeight'
  },

  mounted () {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.dispatchSizeChange()
      })
      this.resizeObserver.observe(this.$el)
    }
  },

  // since componet will be reused, so disptach when updated
  updated () {
    this.dispatchSizeChange()
  },

  beforeUnmount () {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  },

  methods: {
    getCurrentSize () {
      return this.$el ? this.$el[this.shapeKey] : 0
    },

    // tell parent current size identify by unqiue key
    dispatchSizeChange () {
      this.emit(this.event, this.uniqueKey, this.getCurrentSize(), this.hasInitial)
    }
  }
}

// wrapping for item
export const Item = defineComponent({
  name: 'VirtualListItem',
  mixins: [Wrapper],

  props: ItemProps,

  setup (props) {
    const {
      tag,
      extraProps = {},
      index,
      source,
      scopedSlots = {},
      uniqueKey,
      component,
      slotComponent
    } = props
    const propsInner = {
      ...extraProps,
      source,
      index
    }
    return () => h(
      tag,
      { key: uniqueKey, role: 'listitem' },
      [
        typeof slotComponent === 'function'
          ? h('div', slotComponent({ item: source, index: index, scope: props }))
          : h(component, { ...propsInner, scopedSlots })
      ]
    )
  }
})

// wrapping for slot
export const Slot = defineComponent({
  name: 'VirtualListSlot',
  mixins: [Wrapper],
  props: SlotProps,

  render () {
    return h(
      this.tag,
      {},
      this.$slots.default()
    )
  }
})
