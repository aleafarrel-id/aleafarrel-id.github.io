import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Lens } from '../../ui/lens';
import { ImageWithSkeleton } from '../../ui/ImageWithSkeleton';
import { globalEvents, EVENTS } from '../../../lib/events';

import './CircularGallery.css';

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance) {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(key => {
    if (key !== 'constructor' && typeof instance[key] === 'function') {
      instance[key] = instance[key].bind(instance);
    }
  });
}

const DEFAULT_FONT = 'bold 30px Figtree';
/* Fallback mechanism for loading default font dynamically */
const DEFAULT_FONT_URL = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&display=swap';

function deriveFontFamilyFromUrl(url) {
  const fileName = (url.split('/').pop() || 'custom-font').split('?')[0];
  const base = fileName.replace(/\.(woff2?|ttf|otf|eot)$/i, '');
  return base.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'CircularGalleryFont';
}

async function loadFontFromStylesheet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch font stylesheet (${response.status})`);
  const cssText = await response.text();
  const faceBlocks = cssText.match(/@font-face\s*{[^}]*}/g) || [];
  let family = null;
  const fontFaces = [];
  for (const block of faceBlocks) {
    const familyMatch = block.match(/font-family:\s*['"]?([^;'"]+)['"]?/);
    const urlMatch = block.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (!familyMatch || !urlMatch) continue;
    family = familyMatch[1].trim();
    const descriptors = {};
    const weightMatch = block.match(/font-weight:\s*([^;]+);/);
    const styleMatch = block.match(/font-style:\s*([^;]+);/);
    const rangeMatch = block.match(/unicode-range:\s*([^;]+);/);
    if (weightMatch) descriptors.weight = weightMatch[1].trim();
    if (styleMatch) descriptors.style = styleMatch[1].trim();
    if (rangeMatch) descriptors.unicodeRange = rangeMatch[1].trim();
    fontFaces.push(new FontFace(family, `url(${urlMatch[1]})`, descriptors));
  }
  if (!family) throw new Error('No @font-face rule found in the stylesheet');
  await Promise.allSettled(
    fontFaces.map(async face => {
      await face.load();
      document.fonts.add(face);
    })
  );
  return family;
}

async function loadFontFromFile(url) {
  const family = deriveFontFamilyFromUrl(url);
  const fontFace = new FontFace(family, `url(${url})`);
  await fontFace.load();
  document.fonts.add(fontFace);
  return family;
}

async function loadCustomFont(fontUrl) {
  const isStylesheet = fontUrl.includes('fonts.googleapis.com') || /\.css(\?.*)?$/i.test(fontUrl);
  return isStylesheet ? loadFontFromStylesheet(fontUrl) : loadFontFromFile(fontUrl);
}


async function resolveFont(font, fontUrl) {

  const effectiveUrl = fontUrl || (font === DEFAULT_FONT ? DEFAULT_FONT_URL : null);
  if (!effectiveUrl) {
    /* Wait for font availability to avoid system font fallback */
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load(font);
        await document.fonts.ready;
      } catch {

      }
    }
    return font;
  }
  try {
    const family = await loadCustomFont(effectiveUrl);
    const sizeMatch = font.match(/^\s*(.*?\d+px)/);
    const prefix = sizeMatch ? sizeMatch[1].trim() : 'bold 30px';
    const resolved = `${prefix} "${family}"`;
    if (document.fonts && document.fonts.load) {
      try {
        await document.fonts.load(resolved);
      } catch {

      }
    }
    return resolved;
  } catch (error) {
    console.error('CircularGallery: unable to load font from', fontUrl, error);
    return font;
  }
}

function getFontSize(font) {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(gl, text, font = 'bold 30px monospace', color = 'black') {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');


  const scaleFactor = 4;

  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(getFontSize(font) * 1.2);


  canvas.width = (textWidth + 20) * scaleFactor;
  canvas.height = (textHeight + 20) * scaleFactor;


  context.scale(scaleFactor, scaleFactor);

  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';

  context.clearRect(0, 0, textWidth + 20, textHeight + 20);
  context.fillText(text, (textWidth + 20) / 2, (textHeight + 20) / 2);


  const texture = new Texture(gl, {
    generateMipmaps: true,
    minFilter: gl.LINEAR_MIPMAP_LINEAR,
  });
  texture.image = canvas;

  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  constructor({ gl, plane, renderer, text, textColor = '#545050', font = '30px sans-serif' }) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }
  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    this.aspect = width / height;
    const textHeight = this.plane.scale.y * 0.15;
    const textWidth = textHeight * this.aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
  resize(parentScaleX, parentScaleY) {
    const textHeight = parentScaleY * 0.15;
    const textWidth = textHeight * this.aspect;
    this.mesh.scale.set(textWidth / parentScaleX, textHeight / parentScaleY, 1);
    this.mesh.position.y = -0.5 - (textHeight * 0.5) / parentScaleY - 0.05 / parentScaleY;
  }
}

class Media {
  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    renderer,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius = 0,
    font,
    textureCache = null
  }) {
    this.extra = 0;
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.textureCache = textureCache;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }
  createShader() {
    let textureInfo;

    if (this.textureCache && this.textureCache[this.image]) {
      textureInfo = this.textureCache[this.image];
    } else {
      const texture = new Texture(this.gl, {
        generateMipmaps: false
      });
      textureInfo = { texture, loaded: false, sizes: [1, 1], callbacks: [] };
      if (this.textureCache) this.textureCache[this.image] = textureInfo;

      const img = new Image();
      img.decoding = 'async';
      img.src = this.image;
      img.onload = () => {
        texture.image = img;
        textureInfo.sizes = [img.naturalWidth, img.naturalHeight];
        textureInfo.loaded = true;
        textureInfo.callbacks.forEach(cb => cb());
        textureInfo.callbacks = [];
      };
    }

    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 0.2 + cos(p.y * 2.0 + uTime) * 0.2) * (0.02 + uSpeed * 0.1);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        uniform float uLoaded;
        uniform float uTime;
        uniform float uActive;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          
          if (uLoaded < 0.5) {
            float pulse = (sin(uTime * 5.0) + 1.0) * 0.5;
            color = vec4(mix(vec3(0.12), vec3(0.18), pulse), 1.0);
          }
          
          /* Grayscale filter */
          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          
          /* Antialiasing */
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
          
          /* Active item effect: Color transition + Inner Border */
          vec3 finalColor = mix(vec3(gray), color.rgb, uActive);
          
          float innerBorder = smoothstep(-0.03, -0.01, d) - smoothstep(-0.01, 0.01, d);
          finalColor += vec3(1.0) * innerBorder * uActive * 0.4;
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      uniforms: {
        tMap: { value: textureInfo.texture },
        uLoaded: { value: textureInfo.loaded ? 1.0 : 0.0 },
        uActive: { value: 0.0 },
        uPlaneSizes: { value: [1, 1] },
        uImageSizes: { value: textureInfo.sizes },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });

    if (textureInfo.loaded) {
      this.program.uniforms.uImageSizes.value = textureInfo.sizes;
      this.program.uniforms.uLoaded.value = 1.0;
    } else {
      textureInfo.callbacks.push(() => {
        if (this.program) {
          this.program.uniforms.uImageSizes.value = textureInfo.sizes;
          this.program.uniforms.uLoaded.value = 1.0;
        }
      });
    }
  }
  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }
  createTitle() {
    setTimeout(() => {
      if (!this.gl) return;
      this.title = new Title({
        gl: this.gl,
        plane: this.plane,
        renderer: this.renderer,
        text: this.text,
        textColor: this.textColor,
        font: this.font
      });
      if (this.plane.scale && this.plane.scale.x > 0) {
        this.title.resize(this.plane.scale.x, this.plane.scale.y);
      }
    }, this.index * 50);
  }
  update(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    const effectiveBend = this.screen.width < 768 ? this.bend * 0.3 : this.bend;
    if (effectiveBend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(effectiveBend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);

      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (effectiveBend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.01;
    this.program.uniforms.uSpeed.value = this.speed;
    
    const activeFactor = Math.max(0, 1.0 - Math.abs(x) / (this.width * 0.8));
    this.program.uniforms.uActive.value = activeFactor * activeFactor * (3.0 - 2.0 * activeFactor);

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }
  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
      if (this.plane.program.uniforms.uViewportSizes) {
        this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height];
      }
    }
    this.scale = this.screen.height / 1500;
    const sizeFactor = this.screen.width < 768 ? 1.15 : 1;
    this.plane.scale.y = (this.viewport.height * (900 * this.scale * sizeFactor)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * this.scale * sizeFactor)) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];

    if (this.title) {
      this.title.resize(this.plane.scale.x, this.plane.scale.y);
    }

    const oldWidthTotal = this.widthTotal;
    this.padding = this.screen.width < 768 ? 2.5 : 3.5;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;

    if (oldWidthTotal && oldWidthTotal !== this.widthTotal) {
      this.extra = Math.round(this.extra / oldWidthTotal) * this.widthTotal;
    }
  }
}

class App {
  constructor(
    container,
    {
      items,
      bend,
      textColor = '#ffffff',
      borderRadius = 0,
      font = 'bold 30px Figtree',
      scrollSpeed = 2,
      scrollEase = 0.05,
      onClickItem
    } = {}
  ) {
    document.documentElement.classList.remove('no-js');
    this.container = container;
    this.onClickItem = onClickItem;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck, 200);
    this.createRenderer();
    if (!this.gl) return;
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.update();
    this.addEventListeners();
    this.setupIntersectionObserver();
  }
  setupIntersectionObserver() {
    this.isVisible = true;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.isVisible = entry.isIntersecting;
      });
    }, { threshold: 0 });
    this.observer.observe(this.container);
  }
  createRenderer() {
    try {
      this.renderer = new Renderer({
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2)
      });
      this.gl = this.renderer.gl;
      if (!this.gl) throw new Error("WebGL not supported");
      this.gl.clearColor(0, 0, 0, 0);
      this.container.appendChild(this.gl.canvas);
    } catch (e) {
      console.warn("CircularGallery WebGL initialization failed:", e);
      this.gl = null;
    }
  }
  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }
  createScene() {
    this.scene = new Transform();
  }
  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100
    });
  }
  createMedias(items, bend = 1, textColor, borderRadius, font) {
    const galleryItems = items && items.length ? items : [];
    this.mediasImages = galleryItems.concat(galleryItems);
    this.medias = [];
    this.textureCache = {};

    let index = 0;
    const processNext = () => {
      // Check if component was destroyed before this fires
      if (!this.gl || !this.scene) return;
      if (index >= this.mediasImages.length) return;

      const data = this.mediasImages[index];
      this.medias.push(new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend,
        textColor,
        borderRadius,
        font,
        textureCache: this.textureCache
      }));
      index++;

      if (window.requestIdleCallback) {
        window.requestIdleCallback(processNext);
      } else {
        setTimeout(processNext, 16);
      }
    };
    processNext();
  }
  onTouchDown(e) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.touches ? e.touches[0].clientX : e.clientX;
    this.startY = e.touches ? e.touches[0].clientY : e.clientY;
    this.isHorizontalScroll = null;
  }
  onTouchMove(e) {
    if (!this.isDown || !this.isVisible) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    /* Detect primary scroll direction */
    if (this.isHorizontalScroll === null && e.touches) {
      const dx = Math.abs(x - this.start);
      const dy = Math.abs(y - this.startY);
      if (dx < 10 && dy < 10) return;
      this.isHorizontalScroll = dx > dy;
    }


    if (this.isHorizontalScroll === false) return;


    if (e.cancelable) e.preventDefault();

    const speedMultiplier = this.screen ? (this.screen.width < 768 ? 0.08 : 0.04) : 0.04;
    const distance = (this.start - x) * (this.scrollSpeed * speedMultiplier);
    this.scroll.target = this.scroll.position + distance;
  }
  onTouchUp(e) {
    this.isDown = false;
    this.onCheck();
    
    if (this.start !== undefined && e && this.onClickItem) {
      const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      if (x !== undefined && y !== undefined) {
        const dx = Math.abs(x - this.start);
        const dy = Math.abs(y - this.startY);
        if (dx < 5 && dy < 5) {
          if (!this.medias || !this.medias[0]) return;
          
          const rect = this.container.getBoundingClientRect();
          const clickX = x - rect.left;
          const clickY = y - rect.top;
          
          const centerX = this.screen.width / 2;
          const centerY = this.screen.height / 2;
          
          const scale = this.screen.height / 1500;
          const sizeFactor = this.screen.width < 768 ? 1.15 : 1;
          const itemWidth = 700 * scale * sizeFactor;
          const itemHeight = 900 * scale * sizeFactor;
          
          const minX = centerX - itemWidth / 2;
          const maxX = centerX + itemWidth / 2;
          const minY = centerY - itemHeight / 2;
          const maxY = centerY + itemHeight / 2;
          
          if (clickX >= minX && clickX <= maxX && clickY >= minY && clickY <= maxY) {
            const width = this.medias[0].width;
            const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
            const originalLength = this.mediasImages.length / 2;
            const actualIndex = itemIndex % originalLength;
            this.onClickItem(actualIndex);
          }
        }
      }
    }
  }
  onWheel(e) {
    if (!this.isVisible) return;
    const delta = e.deltaY || e.wheelDelta || e.detail;
    this.scroll.target += delta * 0.02 * this.scrollSpeed;
    this.onCheckDebounce();
  }
  onKeyDown(e) {
    if (!this.isVisible) return;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        this.scroll.target += this.scrollSpeed * 5;
        this.onCheckDebounce();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        this.scroll.target -= this.scrollSpeed * 5;
        this.onCheckDebounce();
        break;

      case 'Home':
        e.preventDefault();
        this.scroll.target = 0;
        this.onCheckDebounce();
        break;

      default:
        break;
    }
  }

  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }
  onResize() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    if (this.medias) {
      this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }
  update() {
    if (this.isVisible) {
      this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
      const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
      if (this.medias) {
        this.medias.forEach(media => media.update(this.scroll, direction));
      }
      this.renderer.render({ scene: this.scene, camera: this.camera });
      this.scroll.last = this.scroll.current;
    }
    this.raf = window.requestAnimationFrame(this.update.bind(this));
  }
  addEventListeners() {
    this.boundOnResize = debounce(this.onResize.bind(this), 150);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnTouchDown = this.onTouchDown.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchUp = this.onTouchUp.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);

    window.addEventListener('resize', this.boundOnResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.boundOnResize, { passive: true });
    }


    window.addEventListener('mousedown', this.boundOnTouchDown);
    window.addEventListener('mousemove', this.boundOnTouchMove);
    window.addEventListener('mouseup', this.boundOnTouchUp);


    window.addEventListener('mousewheel', this.boundOnWheel, { passive: true });
    window.addEventListener('wheel', this.boundOnWheel, { passive: true });

    /* Bind touch events locally to avoid blocking global scroll */
    this.container.addEventListener('touchstart', this.boundOnTouchDown, { passive: true });
    this.container.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.boundOnTouchUp);

    window.addEventListener('keydown', this.boundOnKeyDown);
  }
  destroy() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.boundOnResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.boundOnResize);
    }
    window.removeEventListener('mousewheel', this.boundOnWheel);
    window.removeEventListener('wheel', this.boundOnWheel);
    window.removeEventListener('mousedown', this.boundOnTouchDown);
    window.removeEventListener('mousemove', this.boundOnTouchMove);
    window.removeEventListener('mouseup', this.boundOnTouchUp);


    if (this.container) {
      this.container.removeEventListener('touchstart', this.boundOnTouchDown);
      this.container.removeEventListener('touchmove', this.boundOnTouchMove);
      this.container.removeEventListener('touchend', this.boundOnTouchUp);
    }

    if (this.planeGeometry) this.planeGeometry.remove();
    if (this.medias) {
      this.medias.forEach(media => {
        if (media.plane) media.plane.remove();
        if (media.program) media.program.remove();
        if (media.title && media.title.mesh) media.title.mesh.remove();
      });
    }
    if (this.textureCache) {
      Object.values(this.textureCache).forEach(info => {
        if (info.texture) info.texture.remove();
      });
    }

    if (this.renderer?.gl?.canvas?.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
    }
    window.removeEventListener('keydown', this.boundOnKeyDown);
    if (this.observer) this.observer.disconnect();
  }
}

/**
 * @typedef {Object} CircularGalleryProps
 * @property {Array<any>} items
 * @property {number} [bend]
 * @property {string} [textColor]
 * @property {number} [borderRadius]
 * @property {string} [font]
 * @property {string} [fontUrl]
 * @property {number} [scrollSpeed]
 * @property {number} [scrollEase]
 * @property {{tap_to_interact?: string, done?: string}} [strings]
 */

/**
 * @param {CircularGalleryProps} props
 */
export default function CircularGallery({
  items,
  bend = 3,
  textColor = '#ffffff',
  borderRadius = 0.05,
  font = 'bold 30px Figtree',
  fontUrl,
  scrollSpeed = 2,
  scrollEase = 0.05,
  strings
}) {
  const containerRef = useRef(null);
  const [webGLFailed, setWebGLFailed] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [previewImage, setPreviewImage] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const closeButtonRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImage) {
        handleClose();
      }
    };
    
    let focusTimer;
    if (previewImage) {
      document.addEventListener('keydown', handleKeyDown);
      focusTimer = setTimeout(() => {
        closeButtonRef.current?.focus({ preventScroll: true });
      }, 100);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [previewImage]);

  const openPreview = useCallback((index) => {
    if (items && items[index]) {
      setIsClosing(false);
      setPreviewImage(items[index].image || items[index].src);
      document.body.style.overflow = "hidden";
      globalEvents.emit(EVENTS.LENIS_STOP);
    }
  }, [items]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (previewImage) {
        document.body.style.overflow = "";
        globalEvents.emit(EVENTS.LENIS_START);
      }
    };
  }, [previewImage]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    document.body.style.overflow = "";
    globalEvents.emit(EVENTS.LENIS_START);
    closeTimeoutRef.current = setTimeout(() => {
      setPreviewImage(null);
      setIsClosing(false);
      setHovering(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let app;
    let isMounted = true;
    resolveFont(font, fontUrl).then(resolvedFont => {
      if (!isMounted || !containerRef.current) return;
      try {
        app = new App(containerRef.current, {
          items,
          bend,
          textColor,
          borderRadius,
          font: resolvedFont,
          scrollSpeed,
          scrollEase,
          onClickItem: openPreview
        });
        if (!app.gl) {
          setWebGLFailed(true);
        }
      } catch (e) {
        setWebGLFailed(true);
      }
    });

    return () => {
      isMounted = false;
      if (app && app.destroy) app.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, fontUrl, scrollSpeed, scrollEase]);

  const modalContent = previewImage && (
    <div
      className={`project-modal-overlay ${isClosing ? 'closing' : 'entering'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Gallery image preview"
      style={{ zIndex: 9999 }}
    >
      <button
        ref={closeButtonRef}
        className="project-modal-close-btn"
        onClick={handleClose}
        aria-label="Close gallery preview"
      >
        &times;
      </button>
      <div
        className={`project-modal-content-wrapper ${isClosing ? 'closing' : 'entering'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.8} lensSize={180}>
          <img
            src={previewImage}
            alt="Gallery detailed preview"
            className="project-modal-image"
            width="1200"
            height="900"
          />
        </Lens>
      </div>
    </div>
  );

  if (webGLFailed) {
    return (
      <>
        <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory px-4 md:px-12" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none' }}>
          {items.map((item, i) => (
            <div 
              key={i} 
              className="flex-none w-[280px] h-[380px] md:w-[360px] md:h-[480px] snap-center rounded-2xl overflow-hidden relative cursor-pointer" 
              style={{ boxShadow: 'var(--neu-raised)', border: '1px solid var(--shadow-light)', background: 'var(--clr-bg-deep)' }}
              onClick={() => openPreview(i)}
            >
              <ImageWithSkeleton src={item.image || item.src} alt={item.text || item.title} className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" loading="lazy" decoding="async" width="800" height="1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 pointer-events-none">
                <h3 className="text-white font-display font-bold text-2xl tracking-tight mb-2">{item.text || item.title}</h3>
              </div>
            </div>
          ))}
        </div>
        {isClient && createPortal(modalContent, document.body)}
      </>
    );
  }

  return (
    <>
      <div className="relative w-full h-full">
      {!isInteractive && isMobile && (
        <div 
          className="interaction-overlay"
          onClick={() => setIsInteractive(true)}
          role="button"
          tabIndex={0}
          aria-label={strings?.tap_to_interact || "Ketuk untuk berinteraksi"}
        >
          <div className="interaction-overlay-icon">
            <svg viewBox="0 0 84.91 122.88" fill="currentColor" width="48" height="48">
              <path d="M26.6,80.57c-0.11-0.06-0.25-0.14-0.37-0.23c-1.49-1.18-3.13-2.51-4.54-3.66c-2.06-1.69-4.43-3.64-6.09-5.02 c-1.13-0.93-2.42-1.58-3.63-1.83c-0.79-0.14-1.49-0.14-2.06,0.08c-0.45,0.2-0.85,0.56-1.1,1.13c-0.34,0.76-0.51,1.83-0.42,3.3 c0.08,1.3,0.54,2.71,1.13,4.09c0.87,2,2.09,3.86,2.99,5.04c0.06,0.08,0.11,0.14,0.14,0.23l17.84,25.48 c0.23,0.34,0.37,0.71,0.39,1.07c0.37,2.93,0.99,5.16,1.89,6.54c0.68,1.01,1.52,1.52,2.62,1.49h28.07c1.75-0.03,3.33-0.53,4.79-1.55 c1.61-1.1,3.04-2.82,4.37-5.13c0.03-0.03,0.06-0.08,0.08-0.11c0.51-0.87,1.18-2,1.83-3.07c2.85-4.68,5.33-8.77,5.61-14.57l-0.17-8 c-0.03-0.11-0.03-0.23-0.03-0.34s0-0.87,0.03-1.89c0.06-5.3,0.14-11.84-4.71-12.65h-3.13c-0.03,1.49-0.11,3.02-0.2,4.48 c-0.08,1.32-0.17,2.56-0.17,3.78c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34c0-1.21,0.08-2.62,0.17-4.09 c0.31-4.99,0.68-10.71-3.3-11.41h-3.1c-0.17,0-0.34-0.03-0.51-0.06c0.03,1.8-0.08,3.66-0.2,5.47C60.08,70.46,60,71.7,60,72.91 c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34c0-1.21,0.08-2.62,0.17-4.09c0.31-4.99,0.68-10.71-3.3-11.41h-3.1 c-0.23,0-0.42-0.03-0.62-0.08v9.1c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34V41.99c0-4.09-1.66-6.68-3.8-7.75 c-0.79-0.4-1.63-0.59-2.45-0.59c-0.82,0-1.66,0.2-2.45,0.59c-2.11,1.07-3.75,3.66-3.75,7.86v42.81c0,1.3-1.04,2.34-2.34,2.34 c-1.3,0-2.34-1.04-2.34-2.34v-4.34H26.6L26.6,80.57z M39.29,13.99c0,1.55-1.26,2.78-2.78,2.78c-1.55,0-2.78-1.26-2.78-2.78V2.78 c0-1.55,1.26-2.78,2.78-2.78c1.55,0,2.78,1.26,2.78,2.78V13.99L39.29,13.99L39.29,13.99z M13.99,36.95c1.55,0,2.78,1.26,2.78,2.78 c0,1.55-1.26,2.78-2.78,2.78H2.78C1.23,42.5,0,41.24,0,39.73c0-1.55,1.26-2.78,2.78-2.78H13.99L13.99,36.95z M21.92,20.33 c1.08,1.08,1.08,2.85,0,3.93c-1.08,1.08-2.85,1.08-3.93,0l-7.9-7.93c-1.08-1.08-1.08-2.85,0-3.93c1.08-1.08,2.85-1.08,3.93,0 L21.92,20.33L21.92,20.33z M58.47,42.5c-1.55,0-2.78-1.26-2.78-2.78c0-1.55,1.26-2.78,2.78-2.78h11.21c1.55,0,2.78,1.26,2.78,2.78 c0,1.55-1.26,2.78-2.78,2.78H58.47L58.47,42.5z M54.47,23.65c-1.08,1.08-2.85,1.08-3.93,0c-1.08-1.08-1.08-2.85,0-3.93l7.9-7.93 c1.08-1.08,2.85-1.08,3.93,0c1.08,1.08,1.08,2.85,0,3.93L54.47,23.65L54.47,23.65z M48.47,52.79c0.2-0.06,0.39-0.08,0.62-0.08h3.24 c0.17,0,0.37,0.03,0.53,0.06c4.31,0.68,6.26,3.19,7.05,6.45c0.31-0.14,0.65-0.23,0.99-0.23h3.24c0.17,0,0.37,0.03,0.53,0.06 c4.65,0.73,6.51,3.58,7.19,7.19c0.11-0.03,0.23-0.03,0.37-0.03h3.24c0.17,0,0.37,0.03,0.54,0.06c8.91,1.38,8.79,10.23,8.71,17.36 v1.86l0.2,8.23v0.25c-0.34,7.02-3.1,11.56-6.28,16.8c-0.54,0.87-1.07,1.77-1.8,3.02c-0.03,0.03-0.03,0.06-0.06,0.08 c-1.66,2.9-3.58,5.13-5.78,6.65c-2.23,1.55-4.71,2.34-7.41,2.37H35.53c-2.79,0.06-4.96-1.16-6.57-3.55c-1.3-1.92-2.14-4.62-2.59-8 L8.9,86.35l-0.09-0.08c-1.04-1.38-2.45-3.55-3.52-5.95c-0.79-1.8-1.38-3.75-1.52-5.67c-0.14-2.28,0.17-4.09,0.82-5.52 c0.79-1.78,2.09-2.93,3.64-3.55c1.44-0.59,3.07-0.68,4.71-0.34c1.97,0.4,4,1.38,5.72,2.82c1.41,1.18,3.78,3.1,6.09,4.99l1.92,1.58 V42.13c0-6.23,2.76-10.23,6.34-12.04c1.44-0.73,2.99-1.1,4.57-1.1c1.58,0,3.13,0.37,4.56,1.1c3.58,1.8,6.4,5.83,6.4,11.95v10.76 L48.47,52.79L48.47,52.79z" />
            </svg>
          </div>
          <span className="interaction-overlay-text">{strings?.tap_to_interact || "Ketuk untuk berinteraksi"}</span>
        </div>
      )}
      {isInteractive && isMobile && (
        <button
          className="interaction-done-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsInteractive(false);
          }}
          aria-label={strings?.done || "Selesai"}
        >
          <span>{strings?.done || "Selesai"}</span>
        </button>
      )}
      <div
        className="circular-gallery"
        ref={containerRef}
        role="region"
        aria-label="3D Circular Gallery"
        style={{ pointerEvents: (isMobile && !isInteractive) ? 'none' : 'auto' }}
      ></div>
    </div>
    {isClient && createPortal(modalContent, document.body)}
    </>
  );
}
