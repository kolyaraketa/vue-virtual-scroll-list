const DIRECTION_TYPE = {
  FRONT: 1, // scroll up or left.
  BEHIND: 2 // scroll down or right.
}

export default class Virtual {
  constructor (param, updateHook) {
    this.init(param, updateHook)
  }

  init (param, updateHook) {
    // param data.
    this.param = param || {}
    this.updateHook = updateHook

    // size data.
    this.sizes = Object.create(null)
    this.totalSize = 0
    this.averageSize = 0
    this.lastCalculatedIndex = 0
    this.offsetCaches = Object.create(null)

    // scroll data.
    this.offset = 0
    this.direction = ''

    // range data.
    this.range = Object.create(null)
    if (this.param && !this.param.disabled) {
      this.updateRange(0, param.keeps - 1)
    }

    // benchmark test data.
    this.__bsearchCalls = 0
    this.__getIndexOffsetCalls = 0
    this.__getIndexOffsetCacheHits = 0
  }

  destroy () {
    this.init(null, null)
  }

  // return actually render range.
  getRange () {
    return {
      ...this.range
    }
  }

  // return start index offset.
  getOffset (start) {
    return this.getIndexOffset(start)
  }

  updateParam (key, value) {
    if (key in this.param) {
      this.param[key] = value
    }
  }

  // save each size map by id.
  saveSize (id, size) {
    if (!this.param.uniqueIds.includes(id)) {
      return
    }

    if (id in this.sizes) {
      this.totalSize = this.totalSize + (size - this.sizes[id])
    } else {
      this.totalSize = this.totalSize + size
    }

    this.sizes[id] = size
    this.averageSize = Math.round(this.totalSize / Object.keys(this.sizes).length)
  }

  handleScroll (offset) {
    if (this.param.disabled) {
      return
    }

    this.direction = offset < this.offset ? DIRECTION_TYPE.FRONT : DIRECTION_TYPE.BEHIND
    this.offset = offset

    if (this.direction === DIRECTION_TYPE.FRONT) {
      this.handleFront()
    } else if (this.direction === DIRECTION_TYPE.BEHIND) {
      this.handleBehind()
    }
  }

  // ----------- public method end. -----------

  handleFront () {
    const overs = this.getScrollOvers()
    // should not change range if start doesn't exceed overs.
    if (overs > this.range.start) {
      return
    }

    // move up start by a buffer length.
    const start = Math.max(overs - this.param.buffer, 0)
    this.updateRange(start, this.getEndByStart(start))
  }

  handleBehind () {
    const overs = this.getScrollOvers()
    // range should not change if scroll overs within buffer.
    if (overs < this.range.start + this.param.buffer) {
      return
    }

    this.updateRange(overs, this.getEndByStart(overs))
  }

  // return current scroll offset pass over items.
  getScrollOvers () {
    let low = 0
    let middle = 0
    let middleOffset = 0
    let high = this.param.uniqueIds.length

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2)
      middleOffset = this.getIndexOffset(middle)

      this.__bsearchCalls++

      if (middleOffset === this.offset) {
        return middle
      } else if (middleOffset < this.offset) {
        low = middle + 1
      } else if (middleOffset > this.offset) {
        high = middle - 1
      }
    }

    return low > 0 ? --low : 0
  }

  // return a scroll offset from given index.
  // @todo can efficiency be improved more here?
  getIndexOffset (givenIndex) {
    // we know this without calculate!
    if (!givenIndex) {
      return 0
    }

    // get from cache avoid too much calculate.
    if (givenIndex in this.offsetCaches) {
      this.__getIndexOffsetCacheHits++
      return this.offsetCaches[givenIndex]
    }

    let offset = 0
    let indexSize = 0
    for (let index = 0; index <= givenIndex; index++) {
      this.__getIndexOffsetCalls++

      // cache last index offset if exist.
      if (index && indexSize) {
        this.offsetCaches[index] = offset
      }

      indexSize = this.sizes[this.param.uniqueIds[index]]
      offset = offset + (indexSize || this.getEstimateSize())
    }

    // remember last calculate index.
    this.lastCalculatedIndex = Math.max(this.lastCalculatedIndex, givenIndex - 1)
    this.lastCalculatedIndex = Math.min(this.lastCalculatedIndex, this.getLastIndex())

    return offset
  }

  getLastIndex () {
    return this.param.uniqueIds.length - 1
  }

  updateRange (start, end) {
    const cRange = this.correctRange(start, end)

    if (this.range.start !== cRange.start) {
      this.range.start = cRange.start
      this.range.end = cRange.end
      this.range.padFront = this.getPadFront()
      this.range.padBehind = this.getPadBehind()

      this.callUpdateHook()
    }
  }

  // in some conditions range will break, we need correct it.
  correctRange (start, end) {
    const keeps = this.param.keeps
    const total = this.param.uniqueIds.length

    // datas less than keeps, render all.
    if (total <= keeps) {
      start = 0
      end = this.getLastIndex()
    } else if (end - start < keeps - 1) {
      // if range length is less than keeps, corrent it base on end.
      start = end - keeps + 1
    }

    return { start, end }
  }

  callUpdateHook () {
    if (!this.param.disabled) {
      this.updateHook(this.getRange())
    }
  }

  getEndByStart (start) {
    const theoryEnd = start + this.param.keeps - 1
    const truelyEnd = Math.min(theoryEnd, this.getLastIndex())
    return truelyEnd
  }

  getPadFront () {
    return this.getIndexOffset(this.range.start)
  }

  getPadBehind () {
    const end = this.range.end
    const lastIndex = this.getLastIndex()

    // if already calculate all, return the exactly padding.
    if (this.lastCalculatedIndex === lastIndex) {
      return this.getIndexOffset(lastIndex) - this.getIndexOffset(end)
    } else {
      // if not, return a estimate padding.
      return (lastIndex - end) * this.getEstimateSize()
    }
  }

  // get estimate size for one.
  getEstimateSize () {
    return this.averageSize || this.param.estimateSize
  }
}