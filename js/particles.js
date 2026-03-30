/* ========================================
   WebGL Particle Network
   Glowing particles with mouse interaction
   ======================================== */

(function() {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.id = 'particles';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.prepend(canvas);

  var gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) return;

  var NUM = 80;
  var mouse = { x: -1, y: -1 };

  window.addEventListener('mousemove', function(e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  }, { passive: true });

  // --- Particle state ---
  var particles = [];
  for (var i = 0; i < NUM; i++) {
    particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0008,
      size: 2 + Math.random() * 3,
      pulse: Math.random() * Math.PI * 2
    });
  }

  // --- Point shader ---
  var pVS = [
    'attribute vec2 a_pos;',
    'attribute float a_size;',
    'attribute float a_pulse;',
    'uniform float u_time;',
    'uniform vec2 u_res;',
    'varying float v_pulse;',
    'void main() {',
    '  gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0);',
    '  gl_Position.y *= -1.0;',
    '  float p = sin(u_time * 2.0 + a_pulse * 6.28) * 0.5 + 0.5;',
    '  gl_PointSize = (a_size + p * 3.0) * min(u_res.x, u_res.y) / 900.0;',
    '  v_pulse = p;',
    '}'
  ].join('\n');

  var pFS = [
    'precision mediump float;',
    'varying float v_pulse;',
    'uniform float u_time;',
    'void main() {',
    '  float d = length(gl_PointCoord - vec2(0.5));',
    '  if (d > 0.5) discard;',
    '  float core = smoothstep(0.5, 0.05, d);',
    '  float glow = smoothstep(0.5, 0.0, d);',
    '  float r = 0.3 + 0.2 * sin(u_time * 0.7);',
    '  float g = 0.5 + 0.3 * v_pulse;',
    '  float b = 0.9 + 0.1 * cos(u_time * 0.5);',
    '  vec3 col = vec3(r, g, b) * core + vec3(0.2, 0.4, 1.0) * glow * 0.5;',
    '  float alpha = glow * (0.6 + 0.4 * v_pulse);',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  function makeProgram(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }

  var pointProg = makeProgram(pVS, pFS);

  // Buffers
  var pointBuf = gl.createBuffer();

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // Reusable arrays
  var pointData = new Float32Array(NUM * 4);

  function draw(t) {
    var time = t * 0.001;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update particles
    for (var i = 0; i < NUM; i++) {
      var p = particles[i];

      // Mouse attraction
      if (mouse.x >= 0) {
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.25 && dist > 0.01) {
          var force = 0.00015 / dist;
          p.vx += dx * force;
          p.vy += dy * force;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      // Damping
      p.vx *= 0.998;
      p.vy *= 0.998;

      // Wrap
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05;
      if (p.y > 1.05) p.y = -0.05;

      var j = i * 4;
      pointData[j] = p.x;
      pointData[j+1] = p.y;
      pointData[j+2] = p.size;
      pointData[j+3] = p.pulse;
    }

    // Draw points
    gl.useProgram(pointProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.DYNAMIC_DRAW);

    var aPos = gl.getAttribLocation(pointProg, 'a_pos');
    var aSize = gl.getAttribLocation(pointProg, 'a_size');
    var aPulse = gl.getAttribLocation(pointProg, 'a_pulse');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aSize);
    gl.enableVertexAttribArray(aPulse);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 16, 8);
    gl.vertexAttribPointer(aPulse, 1, gl.FLOAT, false, 16, 12);
    gl.uniform1f(gl.getUniformLocation(pointProg, 'u_time'), time);
    gl.uniform2f(gl.getUniformLocation(pointProg, 'u_res'), canvas.width, canvas.height);
    gl.drawArrays(gl.POINTS, 0, NUM);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

})();
