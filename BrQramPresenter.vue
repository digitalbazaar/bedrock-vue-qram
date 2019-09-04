<template>
  <canvas
    ref="canvas"
    class="br-qram-presenter" />
</template>

<script>
/*!
  * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
  */
'use strict';

import * as base64url from 'base64url-universal';
import {Encoder} from 'qram';
import QRCode from 'qrcode';

export default {
  name: 'BrQramPresenter',
  props: {
    // full data to be presented
    data: {
      type: Object,
      default: null,
      required: true
    },
    // block size
    blockSize: {
      type: Number,
      default: 400
    },
    // maximum number of blocks to include in a given packet
    maxBlocksPerPacket: {
      type: Number,
      default: 50
    },
    // number of packets to display per second
    rate: {
      type: Number,
      default: 15
    },
    // error resistance; will be rounded up to nearest acceptable value
    // .30 = H, .25 = Q, .15 = M, .7 = L
    resistance: {
      type: Number,
      default: 0.25
    },
    // when true, presentation will be active and packets will be displayed
    // at the rate specified; when false, new packets will not be displayed
    active: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  data() {
    return {
      presentCount: 0,
      timer: null
    };
  },
  computed: {
    errorCorrectionLevel() {
      const {resistance} = this;
      if(resistance >= .3) {
        return 'H';
      }
      if(resistance >= .25) {
        return 'Q';
      }
      if(resistance >= .15) {
        return 'M';
      }
      return 'L';
    }
  },
  watch: {
    active(isActive) {
      if(isActive) {
        // track present count to prevent two different presentations from
        // overwriting each other
        this.presentCount++;
        this.present();
      }
    }
  },
  methods: {
    async present() {
      if(this.timer) {
        // wait for current timer to expire before presenting again
        await this.timer.nextFrame();
      }

      // prepare state for new presentation
      const {
        data, blockSize, maxBlocksPerPacket, rate: fps, resistance,
        errorCorrectionLevel, presentCount, $refs
      } = this;
      const encoder = new Encoder({data, blockSize, maxBlocksPerPacket});
      const timer = this.timer = encoder.createTimer({fps});
      const canvas = $refs.canvas;
      const version = getBestVersion({blockSize, resistance});
      const stream = await encoder.createReadableStream();
      const reader = stream.getReader();

      // keep presenting while active and present counter matches
      timer.start();
      while(this.active && this.presentCount === presentCount) {
        // read, encode, and present next packet
        const {value: packet} = await reader.read();
        const text = base64url.encode(packet.data);
        await QRCode.toCanvas(canvas, text, {
          version,
          //mode: 'alphanumeric',
          errorCorrectionLevel
        });
        await timer.nextFrame();

        // update rate in case of change
        timer.setRate(this.rate);
      }
    }
  }
};

// TODO: provide more options/be more precise
const BEST_VERSION = new Map([
  // .3 = 'H' (High), .25 = 'Q' (Quartile), .15 = 'M' (Medium), .7 = 'L' (Low)
  [10, new Map([[.25, 14], [.3, 16]])],
  [50, new Map([[.25, 16], [.3, 18]])],
  [100, new Map([[.25, 17], [.3, 19]])],
  [200, new Map([[.25, 19], [.3, 22]])],
  [300, new Map([[.25, 22], [.3, 25]])],
  [400, new Map([[.25, 25], [.3, 29]])],
  [Infinity, new Map([[1, 40]])]
]);

function getBestVersion({blockSize, resistance}) {
  for(const [maxBlockSize, options] of BEST_VERSION.entries()) {
    if(blockSize <= maxBlockSize) {
      for(const [maxResistance, version] of options.entries()) {
        if(resistance <= maxResistance) {
          return version;
        }
      }
    }
  }
  throw new Error('Invalid "blockSize" or "resistance".');
}
</script>

<style lang="scss" scoped>

.br-qram-presenter {
}

</style>
