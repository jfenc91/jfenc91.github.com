/* ========================================
   WebGL Image Effects
   Hover distortion on adventure cards
   ======================================== */

(function() {
  'use strict';

  // Only run on desktop (hover doesn't make sense on touch)
  if ('ontouchstart' in window) return;

  var vsrc = [
    'attribute vec2 a_pos;',
    'varying vec2 v_uv;',
    'void main() {',
    '  v_uv = a_pos * 0.5 + 0.5;',
    '  gl_Position = vec4(a_pos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fsrc = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_tex;',
    'uniform float u_time;',
    'uniform float u_hover;',
    'uniform vec2 u_mouse;',
    '',
    'void main() {',
    '  vec2 uv = v_uv;',
    '',
    '  // Ripple from mouse position',
    '  vec2 d = uv - u_mouse;',
    '  float dist = length(d);',
    '  float ripple = sin(dist * 30.0 - u_time * 4.0) * 0.008 * u_hover;',
    '  ripple *= smoothstep(0.5, 0.0, dist);',
    '  uv += d * ripple;',
    '',
    '  // Chromatic aberration on hover',
    '  float aberr = 0.003 * u_hover;',
    '  vec2 dir = normalize(uv - 0.5) * aberr;',
    '  float r = texture2D(u_tex, uv + dir).r;',
    '  float g = texture2D(u_tex, uv).g;',
    '  float b = texture2D(u_tex, uv - dir).b;',
    '',
    '  // Slight vignette intensify on hover',
    '  float vig = 1.0 - smoothstep(0.3, 0.9, length(uv - 0.5)) * 0.3 * u_hover;',
    '',
    '  gl_FragColor = vec4(r * vig, g * vig, b * vig, 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  function setupCard(card) {
    var img = card.querySelector('img');
    if (!img || !img.complete) return;

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;transition:opacity 0.4s;pointer-events:none;';
    card.style.position = 'relative';
    card.appendChild(canvas);

    var gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vsrc));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    var quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Load texture from img
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    var uTime = gl.getUniformLocation(prog, 'u_time');
    var uHover = gl.getUniformLocation(prog, 'u_hover');
    var uMouse = gl.getUniformLocation(prog, 'u_mouse');

    var hover = 0;
    var targetHover = 0;
    var mouseUV = { x: 0.5, y: 0.5 };
    var animating = false;
    var raf = null;

    card.addEventListener('mouseenter', function() {
      targetHover = 1;
      canvas.style.opacity = '1';
      if (!animating) { animating = true; raf = requestAnimationFrame(render); }
    });

    card.addEventListener('mouseleave', function() {
      targetHover = 0;
    });

    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      mouseUV.x = (e.clientX - rect.left) / rect.width;
      mouseUV.y = 1.0 - (e.clientY - rect.top) / rect.height;
    });

    function render(t) {
      hover += (targetHover - hover) * 0.08;

      if (hover < 0.001 && targetHover === 0) {
        canvas.style.opacity = '0';
        animating = false;
        return;
      }

      canvas.width = card.offsetWidth;
      canvas.height = card.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.uniform1f(uTime, t * 0.001);
      gl.uniform1f(uHover, hover);
      gl.uniform2f(uMouse, mouseUV.x, mouseUV.y);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
  }

  // Wait for images to load, then set up
  window.addEventListener('load', function() {
    var cards = document.querySelectorAll('.adventure-card');
    cards.forEach(function(card) {
      var img = card.querySelector('img');
      if (img.complete) {
        setupCard(card);
      } else {
        img.addEventListener('load', function() { setupCard(card); });
      }
    });
  });

})();
