const blurhash = (function(context) {
  // in closure only

  const digitCharacters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

  const decode83 = str => {
      let value = 0;
      for (let i = 0; i < str.length; i++) {
          const c = str[i];
          const digit = digitCharacters.indexOf(c);
          value = value * 83 + digit;
      }
      return value;
  };

  const sRGBToLinear = value => {
      let v = value / 255;
      if (v <= 0.04045) {
          return v / 12.92;
      } else {
          return Math.pow((v + 0.055) / 1.055, 2.4);
      }
  };

  const linearTosRGB = value => {
      let v = Math.max(0, Math.min(1, value));
      if (v <= 0.0031308) {
          return Math.round(v * 12.92 * 255 + 0.5);
      } else {
          return Math.round(
              (1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5
          );
      }
  };

  const sign = n => (n < 0 ? -1 : 1);

  const signPow = (val, exp) => sign(val) * Math.pow(Math.abs(val), exp);

  const validateBlurhash = blurhash => {
      if (!blurhash || blurhash.length < 6) {
          throw new Error(
              "The blurhash string must be at least 6 characters"
          );
      }

      const sizeFlag = decode83(blurhash[0]);
      const numY = Math.floor(sizeFlag / 9) + 1;
      const numX = (sizeFlag % 9) + 1;

      if (blurhash.length !== 4 + 2 * numX * numY) {
          throw new Error(
              `blurhash length mismatch: length is ${
                  blurhash.length
              } but it should be ${4 + 2 * numX * numY}`
          );
      }
  };

  const decodeDC = value => {
      const intR = value >> 16;
      const intG = (value >> 8) & 255;
      const intB = value & 255;
      return [sRGBToLinear(intR), sRGBToLinear(intG), sRGBToLinear(intB)];
  };

  const decodeAC = (value, maximumValue) => {
      const quantR = Math.floor(value / (19 * 19));
      const quantG = Math.floor(value / 19) % 19;
      const quantB = value % 19;

      const rgb = [
          signPow((quantR - 9) / 9, 2.0) * maximumValue,
          signPow((quantG - 9) / 9, 2.0) * maximumValue,
          signPow((quantB - 9) / 9, 2.0) * maximumValue
      ];

      return rgb;
  };

  // context

  /**
   * @param {String} blurhash
   * @param {Number} width
   * @param {Number} height
   * @param {Number} punch
   * @returns {Promise<Uint8ClampedArray>}
   */
  context.decodePromise = (blurhash, width, height, punch = 1.0) => {
      return new Promise((resolve, reject) => {
          resolve(context.decode(blurhash, width, height, punch));
      });
  };

  /**
   * @param {String} blurhash
   * @param {Number} width
   * @param {Number} height
   * @param {Number} punch
   * @returns {Uint8ClampedArray}
   */
  context.decode = (blurhash, width, height, punch = 1.0) => {
      validateBlurhash(blurhash);

      punch = punch | 1;

      const sizeFlag = decode83(blurhash[0]);
      const numY = Math.floor(sizeFlag / 9) + 1;
      const numX = (sizeFlag % 9) + 1;

      const quantisedMaximumValue = decode83(blurhash[1]);
      const maximumValue = (quantisedMaximumValue + 1) / 166;

      const colors = new Array(numX * numY);

      for (let i = 0; i < colors.length; i++) {
          if (i === 0) {
              const value = decode83(blurhash.substring(2, 6));
              colors[i] = decodeDC(value);
          } else {
              const value = decode83(
                  blurhash.substring(4 + i * 2, 6 + i * 2)
              );
              colors[i] = decodeAC(value, maximumValue * punch);
          }
      }

      const bytesPerRow = width * 4;
      const pixels = new Uint8ClampedArray(bytesPerRow * height);

      for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
              let r = 0;
              let g = 0;
              let b = 0;

              for (let j = 0; j < numY; j++) {
                  for (let i = 0; i < numX; i++) {
                      const basis =
                          Math.cos((Math.PI * x * i) / width) *
                          Math.cos((Math.PI * y * j) / height);
                      let color = colors[i + j * numX];
                      r += color[0] * basis;
                      g += color[1] * basis;
                      b += color[2] * basis;
                  }
              }

              let intR = linearTosRGB(r);
              let intG = linearTosRGB(g);
              let intB = linearTosRGB(b);

              pixels[4 * x + 0 + y * bytesPerRow] = intR;
              pixels[4 * x + 1 + y * bytesPerRow] = intG;
              pixels[4 * x + 2 + y * bytesPerRow] = intB;
              pixels[4 * x + 3 + y * bytesPerRow] = 255; // alpha
          }
      }
      return pixels;
  };

  return context;
})({});

for (let parent of document.getElementsByClassName('blurhash-parent')) {
  let img = parent.querySelector('img');
  const hash = parent.dataset['blurhash'];
  try {
    const width = Number.parseInt(parent.dataset['width']);
    const height = Number.parseInt(parent.dataset['height']);
    if (img && hash && width && height) {
      const rect = parent.getBoundingClientRect();
      let imgRef = {
        loaded: false,
        blurHashImage: null,
        width,
        height,
        classes: [],
      };
      for (let name of img.classList.values()) {
        imgRef.classes.push(name);
      }
      img.classList.add('blurhash-actual-image');
      ratio = window.devicePixelRatio || 1;
      if (width > rect.width) {
        imgRef.width = Math.floor(rect.width) / ratio;
        imgRef.height = Math.floor(height / width * rect.width) / ratio;
      } else {
        imgRef.width /= ratio;
        imgRef.height /= ratio;
      }
      if (img.complete) {
        parent.classList.add('blurhash-loaded');
        continue;
      } else {
        parent.classList.add('blurhash-unloaded');
      }

      img.addEventListener('load', () => {
        imgRef.loaded = true;
        parent.classList.add('blurhash-loaded');
        parent.classList.remove('blurhash-unloaded');
        parent.style.minWidth = null;
        parent.style.minHeight = null;
        parent.style.backgroundImage = null;
        parent.style.backgroundSize = null;
        imgRef.blurHashImage = false;
      });
      setTimeout(() => {
        // TODO delay by 300ms
        requestAnimationFrame(() => {
          const blurhashImgData = blurhash.decode(hash, 64, 64);
          if (blurhashImgData.length <= 0) {
            return;
          }
          if (imgRef.loaded) {
            // Do not add if it has been done
            return;
          }
          parent.style.minWidth = `${imgRef.width}px`;
          parent.style.minHeight = `${imgRef.height}px`;
          const sourceCanvas = document.createElement("canvas");
          let ctx = sourceCanvas.getContext("2d");
          sourceCanvas.width = 64;
          sourceCanvas.height = 64;
          ctx.width = 64;
          ctx.height = 64;
          ctx.putImageData(new ImageData(blurhashImgData, 64, 64), 0, 0);
          requestAnimationFrame(() => {
            if (imgRef.loaded) {
              // Do not add if it has been done
              return;
            }
            parent.style.backgroundImage = `url(${sourceCanvas.toDataURL()})`;
            parent.style.backgroundSize = 'cover';
            imgRef.blurHashImage = true;
          });
        });
      }, 30);
    }
  } catch (e) {
    if (console && console.error) {
      console.error(e);
    }
  }
}
