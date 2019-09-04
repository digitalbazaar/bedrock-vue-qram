<template>
  <div></div>
</template>

<script>
/*!
  * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
  */
'use strict';

import {QramScanner} from './QramScanner.js';

export default {
  name: 'BrQramScanner',
  props: {
    source: {
      type: Object,
      default: null,
      required: true
    }
  },
  data() {
    return {
      scanning: false,
      scanner: null
    };
  },
  methods: {
    async scan() {
      if(!this.scanner) {
        this.scanner = new QramScanner();
      }

      if(this.scanning) {
        this.scanning = false;
        this.scanner.cancel();
        return;
      }

      this.scanning = true;
      const {source: {$el: source}} = this;
      const start = Date.now();
      const result = await this.scanner.scan({
        source,
        progress(event) {
          console.log('progress', event);
        }
      });
      console.log('scan complete', result);
      const {
        blocks,
        receivedPackets,
        receivedBlocks,
        totalBlocks
      } = result;
      console.log(`Decoded ${receivedBlocks}/${totalBlocks} blocks`);
      const time = ((Date.now() - start) / 1000).toFixed(3);
      const {data} = result;
      // console.log('decoded data', data);
      const size = (data.length / 1024).toFixed(3);
      const msg = `Decoded ${size} KiB in time ${time} seconds`;
      console.log(msg);
      this.scanning = false;
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
