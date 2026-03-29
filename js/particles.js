/* ========================================
   WebGL Particle Network
   Connected nodes with glowing lines,
   mouse interaction, and color shifts
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
  var CONNECT_DIST = 0.15;
  var mouse = { x: -1, y: -1 };

  window.addEventListener('mousemove', function(e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  }, { passive: true });

  // --- Particle state (CPU-side for connections) ---
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

  // --- Line shader ---
  var lVS = [
    'attribute vec2 a_pos;',
    'attribute float a_alpha;',
    'varying float v_alpha;',
    'void main() {',
    '  gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0);',
    '  gl_Position.y *= -1.0;',
    '  v_alpha = a_alpha;',
    '}'
  ].join('\n');

  var lFS = [
    'precision mediump float;',
    'varying float v_alpha;',
    'uniform float u_time;',
    'void main() {',
    '  float r = 0.3 + 0.15 * sin(u_time * 0.7);',
    '  float g = 0.5 + 0.2 * sin(u_time * 0.3);',
    '  float b = 1.0;',
    '  gl_FragColor = vec4(r, g, b, v_alpha * 0.35);',
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
  var lineProg = makeProgram(lVS, lFS);

  // Buffers
  var pointBuf = gl.createBuffer();
  var lineBuf = gl.createBuffer();

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
  var lineData = new Float32Array(NUM * NUM * 3 * 2); // worst case

  function draw(t) {
    var time = t * 0.001;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var aspect = canvas.width / canvas.height;

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

    // Draw lines
    var lineCount = 0;
    for (var a = 0; a < NUM; a++) {
      for (var b = a + 1; b < NUM; b++) {
        var pa = particles[a], pb = particles[b];
        var ddx = (pa.x - pb.x) * aspect;
        var ddy = pa.y - pb.y;
        var d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < CONNECT_DIST) {
          var alpha = 1.0 - d / CONNECT_DIST;
          alpha = alpha * alpha; // quadratic falloff
          var li = lineCount * 6;
          lineData[li] = pa.x;
          lineData[li+1] = pa.y;
          lineData[li+2] = alpha;
          lineData[li+3] = pb.x;
          lineData[li+4] = pb.y;
          lineData[li+5] = alpha;
          lineCount++;
        }
      }
    }

    // Also connect to mouse
    if (mouse.x >= 0) {
      for (var m = 0; m < NUM; m++) {
        var pm = particles[m];
        var mdx = (pm.x - mouse.x) * aspect;
        var mdy = pm.y - mouse.y;
        var md = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < 0.2) {
          var ma = (1.0 - md / 0.2);
          ma = ma * ma * 1.5;
          var mi = lineCount * 6;
          lineData[mi] = pm.x;
          lineData[mi+1] = pm.y;
          lineData[mi+2] = ma;
          lineData[mi+3] = mouse.x;
          lineData[mi+4] = mouse.y;
          lineData[mi+5] = ma;
          lineCount++;
        }
      }
    }

    if (lineCount > 0) {
      gl.useProgram(lineProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.bufferData(gl.ARRAY_BUFFER, lineData.subarray(0, lineCount * 6), gl.DYNAMIC_DRAW);

      var lPos = gl.getAttribLocation(lineProg, 'a_pos');
      var lAlpha = gl.getAttribLocation(lineProg, 'a_alpha');
      gl.enableVertexAttribArray(lPos);
      gl.enableVertexAttribArray(lAlpha);
      gl.vertexAttribPointer(lPos, 2, gl.FLOAT, false, 12, 0);
      gl.vertexAttribPointer(lAlpha, 1, gl.FLOAT, false, 12, 8);
      gl.uniform1f(gl.getUniformLocation(lineProg, 'u_time'), time);
      gl.drawArrays(gl.LINES, 0, lineCount * 2);
      gl.disableVertexAttribArray(lAlpha);
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
