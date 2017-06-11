var canvas;
var gl;
var squareVerticesBuffer;
var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var iterations = 1000;
var zoomTarget = 1;
var zoom = 1;
var offset = [0, 0];
var invalidated = true;
var color = 0;
var isDown = false; // whether mouse is pressed
var last = [0, 0]; // lastmouse

function start() {
  canvas = document.getElementById("glcanvas");

  if (canvas.addEventListener) {
    // IE9, Chrome, Safari, Opera
    canvas.addEventListener("mousewheel", MouseWheelHandler, false);
    // Firefox
    canvas.addEventListener("DOMMouseScroll", MouseWheelHandler, false);

    canvas.addEventListener('mousedown', mouseDown, false);
    canvas.addEventListener('mouseup', mouseUp, false);
    canvas.addEventListener('mousemove', mouseMove, false);
    
    document.getElementById('iterations').addEventListener("input", updateIterations, false);
    var rb = document.getElementsByName("color");
    console.log(rb);
    for(var i = 0; i < rb.length; i++) {
      rb[i].onclick = (function(i) { return function() { updateColor(i); }}(i));
    }
  }

  initWebGL(canvas);

  if (gl) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    initShaders();

    initBuffers();

    setInterval(drawScene, 30);
  }
}

function initWebGL() {
  gl = null;

  try {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  }
  catch(e) {
  }

  if (!gl) 
    alert("Unable to initialize WebGL. Your browser may not support it.");
}

function initBuffers() {

  squareVerticesBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);

  var vertices = [
    1.0,  1.0,  0.0,
    -1.0, 1.0,  0.0,
    1.0,  -1.0, 0.0,
    -1.0, -1.0, 0.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function drawScene() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  updatePosition();
  
  if (invalidated) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    //setMatrixUniforms();
    setWindowUniforms(canvas.width, canvas.height);
    setPositionUniforms();
    setRenderingUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    invalidated = false;
  }
}

function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) 
    alert("Unable to initialize the shader program: " + gl.getProgramInfoLog(shader));
  
  gl.useProgram(shaderProgram);

  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttribute);
}

function getShader(gl, id) {
  var shaderScript = document.getElementById(id);

  if (!shaderScript) 
    return null;

  var theSource = "";
  var currentChild = shaderScript.firstChild;

  while(currentChild) {
    if (currentChild.nodeType == 3) 
      theSource += currentChild.textContent;
    
    currentChild = currentChild.nextSibling;
  }

  var shader;

  if (shaderScript.type == "x-shader/x-fragment") 
    shader = gl.createShader(gl.FRAGMENT_SHADER);
   else if (shaderScript.type == "x-shader/x-vertex") 
    shader = gl.createShader(gl.VERTEX_SHADER);
   else 
    return null;  

  gl.shaderSource(shader, theSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function setPositionUniforms() {
  var xUniform = gl.getUniformLocation(shaderProgram, 'offsetX');
  var yUniform = gl.getUniformLocation(shaderProgram, 'offsetY');
  var zUniform = gl.getUniformLocation(shaderProgram, 'zoom');
  gl.uniform1f(xUniform, offset[0]);
  gl.uniform1f(yUniform, offset[1]);
  gl.uniform1f(zUniform, Math.pow(2, zoom));
}

function setWindowUniforms(wWidth, wHeight) {
  var ww = gl.getUniformLocation(shaderProgram, 'ww');
  var wh = gl.getUniformLocation(shaderProgram, 'wh');
  gl.uniform1f(ww, wWidth);
  gl.uniform1f(wh, wHeight);
}

function setRenderingUniforms() {
  var i = gl.getUniformLocation(shaderProgram, 'maxIterations');
  var j = gl.getUniformLocation(shaderProgram, 'colorScheme');
  gl.uniform1i(i, iterations);
  gl.uniform1i(j, color);
}

function updatePosition() {
  var speed = 0.25;
  var delta = (zoomTarget - zoom) * speed;
  if (delta != 0)
    invalidated = true;
  zoom += delta;
}

/* Controls */
function mouseDown(e) {
    isDown = true;

    last = [
        e.offsetX,
        e.offsetY
   ];
};

function mouseUp(e) {
    isDown = false;
};

function mouseMove(e)
{
    if(!isDown) return;

    var x = e.offsetX;
    var y = e.offsetY;
  
    var divisor = 1;

    if (zoom < 4) ;else
    if (zoom < 8) divisor = zoom; else
    if (zoom < 13) divisor = Math.pow(zoom, 2);
    else divisor = Math.pow(zoom, 3);
    console.log(divisor + " | " + zoom);
    offset[0] -= ((x - last[0]) / canvas.width) / divisor ;
    offset[1] += ((y - last[1]) / canvas.height) / divisor ;
    last = [
        x,
        y
   ];
  invalidated = true;
}

function MouseWheelHandler() {
  var e = window.event;
  zoomTarget += Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
  if (zoomTarget == 0)
    zoomTarget = 0.01;
  invalidated = true;
  console.log(zoomTarget);
}

function updateIterations() {
  iterations = document.getElementById('iterations').value;
  document.getElementById('num-iterations').innerHTML = iterations + " iterations";
  invalidated = true;
}

function updateColor(i) {
  color = i;
  console.log("color" + color);
  invalidated = true;
}