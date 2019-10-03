<template>
  <div class="column br-qram-scanner">
    <div
      class="br-qram-video-wrapper row column"
      :style="croppedVideoStyle"
      @click="toggleCamera()">
      <div class="br-qram-cr br-qram-cr-top br-qram-cr-left" />
      <div class="br-qram-cr br-qram-cr-top br-qram-cr-right" />
      <div class="br-qram-cr br-qram-cr-bottom br-qram-cr-left" />
      <div class="br-qram-cr br-qram-cr-bottom br-qram-cr-right" />
      <div
        v-show="enableCamera"
        class="br-qram-cropped-video">
        <video
          ref="video"
          class="br-qram-video"
          :style="videoStyle"
          autoplay
          muted
          playsinline
          @loadedmetadata="videoReady"
          @error="videoError" />
      </div>
      <q-inner-loading
        :showing="loading"
        style="background-color: transparent; font-size: 16px">
        <p>Requesting access to your camera...</p>
        <q-spinner
          size="50px"
          color="primary" />
      </q-inner-loading>
      <q-banner
        v-if="!loading && cameraError"
        rounded
        class="bg-warning full-width">
        <template v-slot:avatar>
          <q-icon name="fas fa-exclamation-triangle" />
        </template>
        <div><strong>Camera disabled</strong></div>
        <div>{{cameraError}}</div>
      </q-banner>
      <div
        v-if="!loading && !enableCamera"
        class="br-qram-camera-message">
        <div>Click to enable camera</div>
      </div>
    </div>
    <br-qram-scan-progress
      v-show="showProgress"
      :style="{width: croppedVideoStyle.width}"
      :idle-message="idleMessage"
      :scanning="scanning"
      :progress="progress" />
  </div>
</template>

<script>
/*!
  * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
  */
'use strict';

import BrQramScanProgress from './BrQramScanProgress.vue';
import {QramScanner} from './QramScanner.js';

export default {
  name: 'BrQramScanner',
  components: {BrQramScanProgress},
  props: {
    maxVideoWidth: {
      type: Number,
      default: 400
    },
    showProgress: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      cameraError: null,
      enableCamera: false,
      loading: true,
      progress: {
        receivedPackets: 0,
        receivedBlocks: 0,
        totalBlocks: 0,
        blocks: {}
      },
      scanning: false,
      scanner: null,
      videoWidth: 0,
      videoHeight: 0
    };
  },
  computed: {
    croppedVideoDimensions() {
      if(!this.enableCamera) {
        // return defaults
        const dim = this.maxVideoWidth;
        return {width: dim, height: dim};
      }
      // determine max height/width of video wrapper to make it square
      const {videoWidth, videoHeight} = this;
      const dim = Math.min(
        this.maxVideoWidth, Math.min(videoWidth, videoHeight));
      return {width: dim, height: dim};
    },
    croppedVideoStyle() {
      const {width, height} = this.croppedVideoDimensions;
      return {width: `${width}px`, height: `${height}px`};
    },
    idleMessage() {
      if(this.loading) {
        return 'Loading...';
      }
      return 'Press "scan" to start scanning';
    },
    videoStyle() {
      // determine margin for shifting video so its center appears in
      // the calculated square video dimensions
      let marginTop = 0;
      let marginLeft = 0;
      if(this.enableCamera) {
        const {videoWidth, videoHeight, croppedVideoDimensions} = this;
        const {width, height} = croppedVideoDimensions;
        if(videoHeight > height) {
          // should be negative
          marginTop = (height - videoHeight) / 2;
        }
        if(videoWidth > width) {
          // should be negative
          marginLeft = (width - videoWidth) / 2;
        }
      }
      return {
        'margin-top': `${marginTop}px`,
        'margin-left': `${marginLeft}px`
      };
    }
  },
  async mounted() {
    await this.toggleCamera();
  },
  beforeDestroy() {
    if(this.enableCamera) {
      this.toggleCamera();
    }
    if(this.scanning) {
      this.cancel();
    }
  },
  methods: {
    videoReady() {
      const {video} = this.$refs;
      this.videoWidth = video.videoWidth;
      this.videoHeight = video.videoHeight;
      this.enableCamera = true;
      this.loading = false;
    },
    async videoError(event) {
      // get error message
      let error = event;
      // Chrome v60
      if(event.path && event.path[0]) {
        error = event.path[0].error;
      }
      // Firefox v55
      if(event.originalTarget) {
        error = error.originalTarget.error;
      }
      this.cameraError = error.message;

      if(this.enableCamera) {
        // disable camera
        this.toggleCamera();
      }
    },
    async toggleCamera() {
      const {$refs: {video}} = this;

      if(this.enableCamera) {
        this.enableCamera = false;
        video.srcObject = null;
        return;
      }

      this.loading = true;

      const constraints = {
        audio: false,
        video: {facingMode: 'environment'}
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        this.cameraError = '';
        // camera will be enabled when `loadedmetadata` event is emitted
        // by `video` element
      } catch(e) {
        this.cameraError = e.message;
        this.enableCamera = false;
        this.loading = false;
      }
    },
    async scan() {
      if(!this.scanner) {
        this.scanner = new QramScanner();
      }

      if(this.scanning) {
        this.cancel();
        return;
      }

      this.scanning = true;
      this.resetProgress();
      const {$refs: {video: source}} = this;
      const start = Date.now();
      const result = await this.scanner.scan({
        source,
        progress: this.updateProgress.bind(this)
      });
      // TODO: update
      console.log('scan complete', result);
      this.updateProgress(result);
      const {receivedBlocks, totalBlocks} = result;
      console.log(`Decoded ${receivedBlocks}/${totalBlocks} blocks`);
      const time = ((Date.now() - start) / 1000).toFixed(3);
      const {data} = result;
      // console.log('decoded data', data);
      const size = (data.length / 1024).toFixed(3);
      const msg = `Decoded ${size} KiB in time ${time} seconds`;
      console.log(msg);
      this.scanning = false;
      this.$emit('result', {result});
    },
    updateProgress(event) {
      console.log('progress', event);
      const {
        totalBlocks, blocks, receivedPackets, receivedBlocks
      } = event;
      const progress = {
        receivedPackets,
        receivedBlocks,
        totalBlocks,
        blocks: {}
      };
      for(const key of blocks.keys()) {
        progress.blocks[key] = true;
      }
      this.progress = progress;
      this.$emit('progress', event);
    },
    cancel() {
      this.scanning = false;
      this.resetProgress();
      this.scanner.cancel();
      this.$emit('cancel');
    },
    resetProgress() {
      this.progress = {
        receivedPackets: 0,
        receivedBlocks: 0,
        totalBlocks: 0,
        blocks: {}
      };
    }
  }
};
</script>

<style lang="scss" scoped>

.br-qram-scanner {
  padding: 10px;
  align-items: center;
}

.br-qram-video-wrapper {
  position: relative;
  padding: 10px;
  width: 100%;
  align-items: center;
  align-self: center;
}

.br-qram-cr {
  border-color: #333;
}
.br-qram-cr-top,
.br-qram-cr-bottom {
  position: absolute;
  width: 20px;
  height: 20px;
}
.br-qram-cr-top {
  top: 0;
  border-top: 2px solid;
}
.br-qram-cr-bottom {
  bottom: 0;
  border-bottom: 2px solid;
}
.br-qram-cr-left {
  left: 0;
  border-left: 2px solid;
}
.br-qram-cr-right {
  right: 0;
  border-right: 2px solid;
}

.br-qram-cropped-video {
  overflow: hidden;
  width: 100%;
}

.br-qram-camera-message {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  font-size: 16px;
  height: 100%;
}

</style>
