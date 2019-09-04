/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import * as base64url from 'base64url-universal';
import {Decoder, getImageData} from 'qram';
import jsQR from 'jsqr';

export class QramScanner {
  constructor() {
    this.decoder = null;
    this.detector = null;
    this.scanning = false;
    this.scans = 0;
  }

  async scan({source, progress = () => {}}) {
    this.scans++;
    const {scans: currentScan} = this;

    if(!this.detector) {
      this.detector = await createDetector();
    }

    if(currentScan !== this.scans) {
      // another scan was started while the detector was being created, abort
      return;
    }

    if(this.scanning) {
      // cancel previous scan
      this.cancel();
    }

    // start new scan
    this.scanning = true;

    const decoder = this.decoder = new Decoder();
    const {detector} = this;

    const enqueue = async () => {
      // try to detect QR code
      const [detectedCode] = await detector.detect(source);

      if(currentScan !== this.scans) {
        // current scan canceled during detection, abort
        return;
      }

      if(!detectedCode) {
        // no QR code found, try again on the next frame
        return requestAnimationFrame(() => setTimeout(enqueue, 0));
      }

      // enqueue the packet data for decoding, ignoring any non-cancel errors
      // and rescheduling until done or aborted
      const data = base64url.decode(detectedCode.rawValue);
      decoder.enqueue(data)
        .then(async event => {
          // if not done and still scanning, report progress and schedule
          // next `enqueue`
          if(!event.done && currentScan === this.scans) {
            await progress(event);
            setTimeout(enqueue, 0);
          }
        })
        .catch(e => {
          if(e.name === 'AbortError') {
            return;
          }
          // if current scan was canceled, do not schedule `enqueue`
          if(currentScan === this.scans) {
            console.error(e);
            setTimeout(enqueue, 0);
          }
        });
    };

    // use `requestAnimationFrame` so that scanning will not happen unless
    // the user has focused the window/tab displaying the qr-code stream
    requestAnimationFrame(() => setTimeout(enqueue, 0));

    try {
      return await decoder.decode();
    } finally {
      this.scanning = false;
      this.decoder = null;
    }
  }

  cancel() {
    if(this.decoder) {
      this.decoder.cancel();
    }
  }
}

async function createDetector() {
  // check if the platform supports QR codes
  if(typeof BarcodeDetector !== 'undefined' &&
    typeof BarcodeDetector.getSupportedFormats === 'function' &&
    (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
    // initialize the barcode detector
    return new BarcodeDetector({formats: ['qr_code']});
  }

  // use jsQR to provide detector
  return {
    detect(image) {
      // use qram helper to get image data
      const imageData = getImageData({source: image});

      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });
      if(!result) {
        return [];
      }
      const {data: rawValue} = result;
      return [{
        rawValue,
        format: 'qr_code'
      }];
    }
  };
}
