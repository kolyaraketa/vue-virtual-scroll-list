import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import VirtualList from './dev/index'
import Introduction from './components/Introduction'
import CodeHighLight from './components/CodeHighLight'
import Corner from './components/Corner'
import Tab from './components/Tab'

const app = createApp(App)

app.use(router)

app.component('virtual-list', VirtualList)
app.component(Introduction.name, Introduction)
app.component(CodeHighLight.name, CodeHighLight)
app.component(Corner.name, Corner)
app.component(Tab.name, Tab)

app.mount('#app')
