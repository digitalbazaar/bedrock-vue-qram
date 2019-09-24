<template>
  <div class="br-qram-progress">
    <div
      v-if="receivedPackets === 0"
      class="column message">
      <div>Waiting to scan...</div>
    </div>
    <div
      v-else-if="done"
      class="column message">
      <div>Scan complete</div>
    </div>
    <div
      v-else
      class="blocks">
      <div
        v-for="n in totalBlocks"
        :key="n"
        class="block"
        :class="{missing: !blocks[n - 1], found: blocks[n - 1]}" />
      <!-- <div class="block-overlay-text">
        Scanning...
      </div> -->
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

export default {
  name: 'BrQramScanProgress',
  props: {
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
  color: #333;
  height: 32px;

  & .message {
    width: 100%;
    align-items: center;
  }

  & > .blocks {
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    width: 100%;
    font-size: 16px;
    color: #333;

    & > div.block {
      border: 1px solid #333;
      border-top: none;
      border-right: none;
    }
    & > div.block:first-child {
      border-left: none;
    }
    & > .block.missing {
      background-color: #aaa;
      flex-grow: 1;
    }
    & > .block.found {
      background-color: #0f0;
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

}

</style>
