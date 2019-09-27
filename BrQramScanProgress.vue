<template>
  <div class="br-qram-progress">
    <div
      v-if="done"
      class="column message success">
      <div>Scan complete</div>
    </div>
    <div
      v-else-if="!scanning"
      class="column message">
      <div>{{idleMessage}}</div>
    </div>
    <div
      v-else-if="receivedPackets === 0"
      class="column message">
      Place scanner over QR code...
    </div>
    <div
      v-else
      class="blocks">
      <div
        v-for="n in totalBlocks"
        :key="n"
        class="block"
        :class="{missing: !blocks[n - 1], found: blocks[n - 1]}" />
      <div class="block-overlay-text">
        <div>{{scanningMessage}}</div>
      </div>
    </div>
    <div class="progress-bar">
      <div
        class="progress-bar-track"
        :style="{'flex-grow': progressBarLeft}" />
      <div
        class="bg-primary"
        :style="{'flex-grow': progressBarMiddle}" />
      <div
        class="progress-bar-track"
        :style="{'flex-grow': progressBarRight}" />
    </div>
  </div>
</template>

<script>
/*!
  * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
  */
'use strict';

const SCAN_TIMEOUT = 1000;

export default {
  name: 'BrQramScanProgress',
  props: {
    loading: {
      type: Boolean,
      default: false,
      required: true
    },
    scanning: {
      type: Boolean,
      default: false,
      required: true
    },
    idleMessage: {
      type: String,
      default: 'Waiting to scan...'
    },
    progress: {
      type: Object,
      default: () => ({
        receivedPackets: 0,
        receivedBlocks: 0,
        totalBlocks: 0,
        blocks: {}
      }),
      required: true
    }
  },
  data() {
    return {
      timedOut: false
    };
  },
  computed: {
    blocks() {
      return this.progress.blocks;
    },
    receivedPackets() {
      return this.progress.receivedPackets;
    },
    receivedBlocks() {
      return this.progress.receivedBlocks;
    },
    totalBlocks() {
      return this.progress.totalBlocks;
    },
    packetProgress() {
      const {receivedPackets, done} = this;
      if(done) {
        return 1;
      }
      // show progress as packets are received
      let progress = (receivedPackets % 10) / 10;
      const reverse = (Math.floor(receivedPackets / 10) % 2 === 1);
      if(reverse) {
        progress = 1 - progress;
      }
      return progress;
    },
    progressBarLeft() {
      if(this.done || this.receivedPackets === 0) {
        return 0;
      }
      return this.packetProgress - 0.1;
    },
    progressBarMiddle() {
      return this.done || this.receivedPackets === 0 ? 1 : 0.1;
    },
    progressBarRight() {
      if(this.done || this.receivedPackets === 0) {
        return 0;
      }
      return 1 - this.packetProgress;
    },
    done() {
      const {receivedPackets, totalBlocks, receivedBlocks} = this;
      return (receivedPackets > 0 && totalBlocks === receivedBlocks);
    },
    scanningMessage() {
      if(this.timedOut) {
        return 'Place scanner over QR code...';
      }
      return 'Scanning, please wait...';
    }
  },
  watch: {
    scanning() {
      // clear timed out flag when scanning is toggled
      this.timedOut = false;
    },
    receivedPackets() {
      this.timedOut = false;
      if(this._timeoutId) {
        clearTimeout(this._timeoutId);
      }
      this._timeoutId = setTimeout(() => this.timedOut = true, SCAN_TIMEOUT);
    }
  }
};
</script>

<style lang="scss" scoped>

.br-qram-progress {
  margin: 15px 5px 5px 5px;
  border: 2px solid #333;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  font-size: 16px;
  color: #111;
  height: 35px;

  & .message {
    width: 100%;
    align-items: center;
    padding: 2px 0 1px 0;
  }

  & > .blocks {
    position: relative;
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    width: 100%;

    & > div.block {
      //border: 1px solid #0b0;
      border-top: none;
      border-right: none;
    }
    & > div.block:first-child {
      border-left: none;
    }
    & > .block.missing {
      background-color: #ddd;
      border: 1px solid #ccc;
      flex-grow: 1;
    }
    & > .block.found {
      background-color: #0f0;
      //background-color: #3498db;
      border: 1px solid #0b0;
      //border: 1px solid #2a86c3;
      flex-grow: 1;
    }
  }
}

.progress-bar {
  display: flex;
  flex-direction: row;
  height: 4px;
  width: 100%;

  & > div {
    flex-grow: 1;
  }

  & > .progress-bar-track {
    background: rgba(0, 0, 0, 0.26);
  }
}

.block-overlay-text {
  position: absolute;
  width: 100%;
  height: 100%;
  background: transparent;
  z-index: 2;
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-top: 1px;
}

.success {
  background: #0d0;
}

</style>
