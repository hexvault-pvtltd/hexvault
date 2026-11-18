// Each vertex carries its CSS position, diameter, opacity, and lighting class.
export function createParticleRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true });
  if (!gl) return null;
  const program = gl.createProgram()!;
  function attach(type: number, source: string) {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    gl!.attachShader(program, shader);
    gl!.deleteShader(shader);
  }
  attach(gl.VERTEX_SHADER, `
    attribute vec2 position;
    attribute vec3 paint;
    uniform vec2 viewport;
    uniform float pixelRatio;
    uniform float bloom;
    varying lowp vec4 ink;
    varying mediump float softness;
    void main() {
      gl_Position = vec4((position / viewport * 2.0 - 1.0) * vec2(1.0,-1.0), 0.0, 1.0);
      softness = 1.1 + paint.z * bloom;
      gl_PointSize = max(1.0, paint.x * pixelRatio * softness);
      vec3 color = paint.z < 0.5 ? vec3(.88,.27,.075) :
        (paint.z < 1.5 ? vec3(1.,.416,.17) : vec3(1.,.54,.27));
      ink = vec4(color, paint.y * min(1.0, paint.x * pixelRatio));
    }`);
  attach(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying lowp vec4 ink;
    varying mediump float softness;
    void main() {
      float r = length(gl_PointCoord * 2.0 - 1.0);
      float core = 1.0 - smoothstep(.12, 1.0, r * softness);
      float halo = (1.0 - smoothstep(0.0, 1.0, r)) * (softness - 1.0) * .38;
      float a = ink.a * min(1.0, core + halo);
      gl_FragColor = vec4(ink.rgb * a, a);
    }`);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name, length, offset] of [["position", 2, 0], ["paint", 3, 8]] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, length, gl.FLOAT, false, 20, offset);
  }
  const viewport = gl.getUniformLocation(program, "viewport");
  const pixelRatio = gl.getUniformLocation(program, "pixelRatio");
  const bloom = gl.getUniformLocation(program, "bloom");
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  let vertices = new Float32Array(0);
  let count = 0;
  return {
    resize(capacity: number, width: number, height: number, ratio: number, glow: number) {
      vertices = new Float32Array((capacity + 1) * 5);
      gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(viewport, width, height);
      gl.uniform1f(pixelRatio, ratio);
      gl.uniform1f(bloom, glow);
    },
    point(x: number, y: number, size: number, opacity: number, color: number) {
      const offset = count++ * 5;
      vertices[offset] = x;
      vertices[offset + 1] = y;
      vertices[offset + 2] = size;
      vertices[offset + 3] = opacity;
      vertices[offset + 4] = color;
    },
    flush() {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices.subarray(0, count * 5));
      gl.drawArrays(gl.POINTS, 0, count);
      count = 0;
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
