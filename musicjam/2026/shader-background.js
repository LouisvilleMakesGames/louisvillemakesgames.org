(function () {
  var canvas = document.getElementById("shader-bg");
  if (!canvas) return;

  var gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return;

  var vertexSource = "\nattribute vec2 a_position;\nvoid main() {\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}\n";

  var fragmentSource = "\nprecision mediump float;\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform float u_time;\n\nfloat hash(vec2 p) {\n  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\n}\n\nfloat noise(vec2 p) {\n  vec2 i = floor(p);\n  vec2 f = fract(p);\n  vec2 u = f * f * (3.0 - 2.0 * f);\n\n  float a = hash(i + vec2(0.0, 0.0));\n  float b = hash(i + vec2(1.0, 0.0));\n  float c = hash(i + vec2(0.0, 1.0));\n  float d = hash(i + vec2(1.0, 1.0));\n\n  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n}\n\nfloat fbm(vec2 p) {\n  float value = 0.0;\n  float amplitude = 0.52;\n  for (int i = 0; i < 6; i++) {\n    value += amplitude * noise(p);\n    p *= 2.06;\n    amplitude *= 0.5;\n  }\n  return value;\n}\n\nmat2 rot(float a) {\n  float s = sin(a);\n  float c = cos(a);\n  return mat2(c, -s, s, c);\n}\n\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);\n  vec2 m = u_mouse / u_resolution;\n  vec2 mouse = vec2(m.x, 1.0 - m.y);\n\n  vec2 delta = uv - mouse;\n  delta.x *= aspect.x;\n  float d = length(delta);\n  float t = u_time * 0.2;\n\n  float interactionRadius = 0.11;\n  float local = 1.0 - smoothstep(interactionRadius, interactionRadius + 0.05, d);\n\n  float holeRadius = 0.018;\n  float pull = pow(local, 2.2) * 0.065;\n  vec2 dir = normalize(delta + 0.00001);\n  vec2 pulled = delta - dir * pull;\n\n  float swirl = pow(local, 2.0) * 0.8;\n  pulled = rot(swirl + sin(t + d * 22.0) * 0.05 * local) * pulled;\n\n  vec2 sampleUV = vec2(pulled.x / aspect.x, pulled.y) + mouse;\n  vec2 p = sampleUV * aspect * 5.6;\n\n  float f1 = fbm(p + vec2(0.0, t));\n  float f2 = fbm(p * 1.75 + vec2(-t * 1.2, t * 0.45));\n  float field = mix(f1, f2, 0.56);\n\n  vec3 deepBlue = vec3(0.04, 0.08, 0.38);\n  vec3 electricBlue = vec3(0.07, 0.58, 1.0);\n  vec3 neonPurple = vec3(0.66, 0.20, 1.0);\n  vec3 neonPink = vec3(1.00, 0.20, 0.80);\n  vec3 hotWhitePink = vec3(1.0, 0.86, 0.97);\n\n  float layerA = smoothstep(0.40, 0.53, field);\n  float layerB = smoothstep(0.53, 0.67, field);\n  float layerC = smoothstep(0.67, 0.80, field);\n  float outline = smoothstep(0.49, 0.55, field) - smoothstep(0.58, 0.64, field);\n\n  vec3 color = mix(deepBlue, electricBlue, layerA);\n  color = mix(color, neonPurple, layerB);\n  color = mix(color, neonPink, layerC);\n  color = mix(color, hotWhitePink, outline * 0.95);\n\n  float core = smoothstep(holeRadius, 0.0, d) * local;\n  float ring = exp(-pow((d - 0.043) * 52.0, 2.0)) * local;\n  color *= (1.0 - core * 0.92);\n  color += vec3(1.0, 0.3, 0.85) * ring * 0.24;\n\n  float lens = local * 0.22;\n  color += vec3(0.05, 0.02, 0.09) * lens;\n\n  float vignette = smoothstep(1.12, 0.16, distance(uv, vec2(0.5)));\n  color *= mix(0.82, 1.20, vignette);\n\n  gl_FragColor = vec4(color, 1.0);\n}\n";

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  var fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  var aPosition = gl.getAttribLocation(program, "a_position");
  var uResolution = gl.getUniformLocation(program, "u_resolution");
  var uMouse = gl.getUniformLocation(program, "u_mouse");
  var uTime = gl.getUniformLocation(program, "u_time");
  var mouseX = window.innerWidth * 0.5;
  var mouseY = window.innerHeight * 0.5;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = Math.floor(window.innerWidth * dpr);
    var height = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      gl.viewport(0, 0, width, height);
    }
  }

  function frame(now) {
    resize();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouseX * Math.min(window.devicePixelRatio || 1, 2), mouseY * Math.min(window.devicePixelRatio || 1, 2));
    gl.uniform1f(uTime, now * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(frame);
  }

  window.addEventListener("mousemove", function (event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  window.addEventListener("touchmove", function (event) {
    if (!event.touches || !event.touches.length) return;
    mouseX = event.touches[0].clientX;
    mouseY = event.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
})();
