class Calc {
    fact(x) {
        var result = 1;
        for(var i = 1; i <= x; i++) {
            result *= i;
        }
        return result;
    }

    basis(i, n, t, iF, nF) {
        return nF / iF / this.fact(n - 1 - i) * Math.pow(t, i) * Math.pow(1 - t, n - 1 - i);
    }

    bezier(points, t) {
        var n = points.length / 2;
        var i = 0;
    
        var nF = this.fact(n - 1);
        var iF = this.fact(i);
    
        var curvePoint = [0, 0];
        for(var j = i * 2; j < points.length; j += 2) {
            var x = points[j];
            var y = points[j + 1];
    
            var temp = this.basis(i, n, t, iF, nF);
            curvePoint[0] += x * temp;
            curvePoint[1] += y * temp;
    
            i++;
            iF *= i;
        }
        return curvePoint;
    }

    getPointsCurve(points, color) {
        var curvePoints = [];
    
        // start
        curvePoints.push(points[0]);
        curvePoints.push(points[1]);
        curvePoints = curvePoints.concat(color);
    
        var step = 0.001;
        for(var t = step; t <= 1; t += step) {
            var point = this.bezier(points, t);
            
            curvePoints.push(point[0]);
            curvePoints.push(point[1]);
            curvePoints = curvePoints.concat(color);
        }
    
        // end
        curvePoints.push(points[points.length - 2]);
        curvePoints.push(points[points.length - 1]);
        curvePoints = curvePoints.concat(color);
    
        return curvePoints;
    }

    hexToRgb(hex) {
        var c;
        if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
            c = hex.substring(1).split('');
            if(c.length == 3){
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return [(c>>16)&255 / 255, (c>>8)&255 / 255, c&255 / 255];
        }
        throw new Error('Bad Hex');
    }
}


class WebGL {
    constructor (selectorCanvas, basePath) {
        this.gl;
        this.program; 
        this.vertexArray = [];
        this.pointsArray = [];
        this.selectorCanvas = selectorCanvas;

        this.color;
        this.Calc = new Calc();

        this.init(basePath);
    }

    loadTextResource(url) {
        return new Promise(function(resolve, reject){
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.onload = function () {
                if (request.status >= 200 && request.status < 300) {
                    resolve(request.responseText);
                }else{
                    reject('Error: HTTP status - ' + request.status + ' on resource ' + url);
                }
            }
            request.send();
        });
    }

    init(basePath) {
        var VSText, FSText;
        var _this = this;

        Promise.all([this.loadTextResource(basePath + 'shaders/vertexShader.glsl'), this.loadTextResource(basePath + 'shaders/fragmentShader.glsl')])
        .then(function(result) {
            VSText = result[0];
            FSText = result[1];
            _this.startWebGL(VSText, FSText);
        })
        .catch(function(error) {
            alert('Error. See console.');
            console.error(error);
        })
    }

    createShader(type, source){
        var shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert('Error compiling shader!');
            console.error('Shader error info: ', this.gl.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    }

    createProgram(vertexShader, fragmentShader){
        this.program = this.gl.createProgram();
    
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
    
        this.gl.linkProgram(this.program);
        this.gl.validateProgram(this.program);
    
    
        if (!this.gl.getProgramParameter(this.program, this.gl.VALIDATE_STATUS)) {
            console.error('Error validating program ', this.gl.getProgramInfoLog(this.program));
            return false;
        }
    }

    startWebGL(vertexShaderText, fragmentShaderText) {
        var canvas = document.querySelector(this.selectorCanvas);
    
        this.gl = canvas.getContext('webgl');
    
        if (!this.gl) {
            alert('Your browser does not support WebGL');
            return;
        }
    
        canvas.height = this.gl.canvas.clientHeight;
        canvas.width = this.gl.canvas.clientWidth;
    
        var _this = this;
        canvas.addEventListener('mousedown', function(event){
            _this.onmousedown(event, canvas, _this);
        });
    
        this.gl.viewport(0,0, this.gl.canvas.width, this.gl.canvas.height);
    
        var vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderText);
        var fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderText);
    
        this.createProgram(vertexShader, fragmentShader);
        
        this.color = document.querySelector('input[type="color"]');
        this.draw();
    };

    draw(){
        var vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        
    
        var resultArray = this.vertexArray.slice();
        var verticesNumber = this.vertexArray.length / 5;
    
        var curvePoints = [];
        if(this.pointsArray.length / 2 > 1) {
            var curvePoints = this.Calc.getPointsCurve(this.pointsArray, this.Calc.hexToRgb(this.color.value));
        }
        var curvePointNumber = curvePoints.length / 5;
        resultArray = resultArray.concat(curvePoints);
    
    
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(resultArray), this.gl.STATIC_DRAW);
    
        var positionAttribLocation = this.gl.getAttribLocation(this.program, 'vertexPosition');
        this.gl.vertexAttribPointer(positionAttribLocation, 2, this.gl.FLOAT, this.gl.FALSE, 5 * Float32Array.BYTES_PER_ELEMENT, 0 * Float32Array.BYTES_PER_ELEMENT);
        this.gl.enableVertexAttribArray(positionAttribLocation);
        
        var colorAttribLocation = this.gl.getAttribLocation(this.program, 'vertexColor');
        this.gl.vertexAttribPointer(colorAttribLocation, 3, this.gl.FLOAT, this.gl.FALSE, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
        this.gl.enableVertexAttribArray(colorAttribLocation);
    
        this.gl.clearColor(0.75, 0.9, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.useProgram(this.program);
        
    
        this.gl.drawArrays(this.gl.POINTS, 0, verticesNumber);
        this.gl.drawArrays(this.gl.POINTS, verticesNumber, curvePointNumber);
        this.gl.drawArrays(this.gl.LINE_STRIP, verticesNumber, curvePointNumber);
    }

    onmousedown(event, canvas, _this){
        var x = event.clientX;
        var y = event.clientY;
    
        var middle_X = _this.gl.canvas.width / 2;
        var middle_Y = _this.gl.canvas.height / 2;
    
    
        var rect = canvas.getBoundingClientRect();
        x = ((x - rect.left) - middle_X) / middle_X;
        y = (middle_Y - (y - rect.top)) / middle_Y;
    
        // only points
        _this.pointsArray.push(x);
        _this.pointsArray.push(y);
    
        // points & color
        _this.vertexArray.push(x);
        _this.vertexArray.push(y);
        _this.vertexArray = _this.vertexArray.concat([0, 0, 0]);
    
        _this.draw();
    }
}

new WebGL('canvas', window.location.href);
