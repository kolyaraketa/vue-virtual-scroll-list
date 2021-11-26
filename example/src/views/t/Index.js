import { defineComponent, h, ref } from 'vue'

export default defineComponent({
  setup () {
    const v = ref({})
    const onCLick = () => {
      const newValue = { time: Date.now(), clicked: (v.value.clicked || 0) + 1 }
      v.value = newValue
    }
    return () => h(
      'div',
      { id: 'test', style: { 'margin-top': '50px' }},
      [
        h(
          'button',
          { onClick: onCLick },
          'CLICKED ' + (v.value.clicked || 0)
        ),
        h('span', {}, v.value.time)
      ]
    )
  }
})
